import { Router } from "oak";
import { config } from "../config/env.ts";
import { generateSecret, generateTOTPUri, verifyTOTP, validateTOTPFormat } from "../services/totp.ts";
import { generateQRCode } from "../services/qrcode.ts";
import {
  setUserSecret,
  getUserSecret,
  deleteUserSecret,
  userExists,
  incrementAttempts,
  getAttempts,
  resetAttempts,
  getLockoutTTL,
} from "../services/redis.ts";
import type {
  RegisterRequest,
  RegisterResponse,
  VerifyTOTPRequest,
  VerifyTOTPResponse,
  GetSecretRequest,
  GetSecretResponse,
  ErrorResponse,
} from "../types/index.ts";

export const authRouter = new Router();

/**
 * POST /api/auth/register
 * ユーザー登録 & TOTP秘密鍵生成
 */
authRouter.post("/api/auth/register", async (ctx) => {
  try {
    const body = await ctx.request.body({ type: "json" }).value as RegisterRequest;
    const { username, email } = body;

    // バリデーション
    if (!username || username.length < 3) {
      ctx.response.status = 400;
      ctx.response.body = {
        error: "Username is required and must be at least 3 characters",
      } as ErrorResponse;
      return;
    }

    // ユーザー名の重複チェック
    const exists = await userExists(username);
    if (exists) {
      ctx.response.status = 409;
      ctx.response.body = {
        error: "Username already exists",
      } as ErrorResponse;
      return;
    }

    // TOTP秘密鍵を生成
    const secret = generateSecret();
    console.log(`🔑 Generated secret for ${username}: ${secret}`);

    // TOTP URIを生成
    const label = email ? `${username} (${email})` : username;
    const totpUri = generateTOTPUri(label, secret);

    // QRコードを生成
    const qrCodeUrl = await generateQRCode(totpUri);

    // Redisに秘密鍵を保存
    await setUserSecret(username, secret);

    // 成功レスポンス
    ctx.response.status = 201;
    ctx.response.body = {
      success: true,
      message: "Registration successful. Scan the QR code with Google Authenticator.",
      secret: secret,
      qrCodeUrl: qrCodeUrl,
      manualEntryKey: secret,
    } as RegisterResponse;

  } catch (error) {
    console.error("Error in register:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      error: "Internal server error",
    } as ErrorResponse;
  }
});

/**
 * POST /api/auth/verify
 * TOTP検証・ログイン
 */
authRouter.post("/api/auth/verify", async (ctx) => {
  try {
    const body = await ctx.request.body({ type: "json" }).value as VerifyTOTPRequest;
    const { username, token } = body;

    // バリデーション
    if (!username || !token) {
      ctx.response.status = 400;
      ctx.response.body = {
        error: "Username and token are required",
      } as ErrorResponse;
      return;
    }

    if (!validateTOTPFormat(token)) {
      ctx.response.status = 400;
      ctx.response.body = {
        error: "Invalid token format. Must be 6 digits",
      } as ErrorResponse;
      return;
    }

    // ユーザー存在チェック
    const secret = await getUserSecret(username);
    if (!secret) {
      ctx.response.status = 404;
      ctx.response.body = {
        error: "User not found. Please register first.",
      } as ErrorResponse;
      return;
    }

    // ロックアウトチェック
    const attempts = await getAttempts(username);
    if (attempts >= config.otp.maxAttempts) {
      const lockoutTTL = await getLockoutTTL(username);
      ctx.response.status = 429;
      ctx.response.body = {
        error: "Too many failed attempts. Account temporarily locked.",
        details: `Try again in ${lockoutTTL} seconds`,
      } as ErrorResponse;
      return;
    }

    // TOTP検証
    const isValid = verifyTOTP(secret, token);

    if (!isValid) {
      // 失敗回数をインクリメント
      const newAttempts = await incrementAttempts(username);
      const remaining = config.otp.maxAttempts - newAttempts;

      if (remaining <= 0) {
        ctx.response.status = 429;
        ctx.response.body = {
          error: "Too many failed attempts. Account temporarily locked.",
          details: `Try again in ${config.otp.lockoutDuration} seconds`,
        } as ErrorResponse;
      } else {
        ctx.response.status = 400;
        ctx.response.body = {
          error: "Invalid token",
          details: `${remaining} attempts remaining`,
        } as ErrorResponse;
      }
      return;
    }

    // ✅ 検証成功
    // 試行回数をリセット
    await resetAttempts(username);

    // セッショントークン生成
    const sessionToken = crypto.randomUUID();

    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
      message: "Login successful",
      sessionToken: sessionToken,
      user: {
        username,
      },
    } as VerifyTOTPResponse;

  } catch (error) {
    console.error("Error in verify:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      error: "Internal server error",
    } as ErrorResponse;
  }
});

/**
 * POST /api/auth/get-qr
 * 既存ユーザーのQRコードを再取得
 */
authRouter.post("/api/auth/get-qr", async (ctx) => {
  try {
    const body = await ctx.request.body({ type: "json" }).value as GetSecretRequest;
    const { username } = body;

    if (!username) {
      ctx.response.status = 400;
      ctx.response.body = {
        error: "Username is required",
      } as ErrorResponse;
      return;
    }

    // ユーザーの秘密鍵を取得
    const secret = await getUserSecret(username);
    if (!secret) {
      ctx.response.status = 404;
      ctx.response.body = {
        error: "User not found",
      } as ErrorResponse;
      return;
    }

    // QRコードを再生成
    const totpUri = generateTOTPUri(username, secret);
    const qrCodeUrl = await generateQRCode(totpUri);

    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
      qrCodeUrl: qrCodeUrl,
      manualEntryKey: secret,
    } as GetSecretResponse;

  } catch (error) {
    console.error("Error in get-qr:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      error: "Internal server error",
    } as ErrorResponse;
  }
});

/**
 * DELETE /api/auth/user/:username
 * ユーザー削除（デバッグ用）
 */
authRouter.delete("/api/auth/user/:username", async (ctx) => {
  try {
    const username = ctx.params.username;

    if (!username) {
      ctx.response.status = 400;
      ctx.response.body = {
        error: "Username is required",
      } as ErrorResponse;
      return;
    }

    const exists = await userExists(username);
    if (!exists) {
      ctx.response.status = 404;
      ctx.response.body = {
        error: "User not found",
      } as ErrorResponse;
      return;
    }

    await deleteUserSecret(username);
    await resetAttempts(username);

    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
      message: `User ${username} deleted successfully`,
    };

  } catch (error) {
    console.error("Error in delete user:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      error: "Internal server error",
    } as ErrorResponse;
  }
});

/**
 * GET /api/health
 * ヘルスチェックエンドポイント
 */
authRouter.get("/api/health", (ctx) => {
  ctx.response.status = 200;
  ctx.response.body = {
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: config.server.environment,
    authMethod: "TOTP (Google Authenticator)",
  };
});

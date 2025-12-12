import * as OTPAuth from 'otpauth';

/**
 * TOTP秘密鍵を生成
 */
export function generateSecret(): string {
  const secret = new OTPAuth.Secret({ size: 20 });
  return secret.base32;
}

/**
 * TOTP URIを生成（QRコード用）
 *
 * @param username ユーザー名
 * @param secret Base32エンコードされた秘密鍵
 * @param issuer アプリ名（Google Authenticatorに表示される）
 */
export function generateTOTPUri(
  username: string,
  secret: string,
  issuer: string = 'sample-TOTP-API'
): string {
  const totp = new OTPAuth.TOTP({
    issuer: issuer,
    label: username,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: secret,
  });

  return totp.toString();
}

/**
 * TOTPトークンを検証
 *
 * @param secret ユーザーの秘密鍵
 * @param token ユーザーが入力した6桁のコード
 * @param window 時間窓（前後何ステップまで許容するか）デフォルト1 = ±30秒
 */
export function verifyTOTP(secret: string, token: string, window: number = 1): boolean {
  try {
    const totp = new OTPAuth.TOTP({
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: secret,
    });

    // トークンを検証（時間窓を考慮）
    const delta = totp.validate({ token, window });

    // delta が null でなければ有効
    return delta !== null;
  } catch (error) {
    console.error('TOTP verification error:', error);
    return false;
  }
}

/**
 * 現在のTOTPトークンを生成（デバッグ用）
 */
export function generateCurrentToken(secret: string): string {
  const totp = new OTPAuth.TOTP({
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: secret,
  });

  return totp.generate();
}

/**
 * TOTPトークンのフォーマットをバリデーション
 */
export function validateTOTPFormat(token: string): boolean {
  return /^\d{6}$/.test(token);
}

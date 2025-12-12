import { connect, Redis } from "redis";
import { config } from "../config/env.ts";

let redisClient: Redis | null = null;

/**
 * Redisクライアントを取得（シングルトン）
 */
export async function getRedisClient(): Promise<Redis> {
  if (!redisClient) {
    console.log(`🔌 Connecting to Redis at ${config.redis.host}:${config.redis.port}...`);
    redisClient = await connect({
      hostname: config.redis.host,
      port: config.redis.port,
    });
    console.log("✅ Connected to Redis");
  }
  return redisClient;
}

/**
 * OTPをRedisに保存
 */
export async function setOTP(phoneNumber: string, otp: string, ttl: number): Promise<void> {
  const client = await getRedisClient();
  const key = `otp:${phoneNumber}`;
  await client.setex(key, ttl, otp);
  console.log(`💾 OTP saved for ${phoneNumber} (TTL: ${ttl}s)`);
}

/**
 * RedisからOTPを取得
 */
export async function getOTP(phoneNumber: string): Promise<string | null> {
  const client = await getRedisClient();
  const key = `otp:${phoneNumber}`;
  const otp = await client.get(key);
  return otp || null;
}

/**
 * OTPを削除（使用済み）
 */
export async function deleteOTP(phoneNumber: string): Promise<void> {
  const client = await getRedisClient();
  const key = `otp:${phoneNumber}`;
  await client.del(key);
  console.log(`🗑️  OTP deleted for ${phoneNumber}`);
}

/**
 * OTPの残り有効時間を取得
 */
export async function getOTPTTL(phoneNumber: string): Promise<number> {
  const client = await getRedisClient();
  const key = `otp:${phoneNumber}`;
  return await client.ttl(key);
}

/**
 * 検証試行回数をインクリメント
 */
export async function incrementAttempts(phoneNumber: string): Promise<number> {
  const client = await getRedisClient();
  const key = `attempt:${phoneNumber}`;
  
  const exists = await client.exists(key);
  
  if (!exists) {
    // 初回: カウンターを作成
    await client.setex(key, config.otp.lockoutDuration, "1");
    return 1;
  } else {
    // 2回目以降: インクリメント
    const newCount = await client.incr(key);
    return newCount;
  }
}

/**
 * 検証試行回数を取得
 */
export async function getAttempts(phoneNumber: string): Promise<number> {
  const client = await getRedisClient();
  const key = `attempt:${phoneNumber}`;
  const attempts = await client.get(key);
  return attempts ? parseInt(attempts) : 0;
}

/**
 * 検証試行回数をリセット
 */
export async function resetAttempts(phoneNumber: string): Promise<void> {
  const client = await getRedisClient();
  const key = `attempt:${phoneNumber}`;
  await client.del(key);
  console.log(`🔄 Attempts reset for ${phoneNumber}`);
}

/**
 * ロックアウト残り時間を取得
 */
export async function getLockoutTTL(phoneNumber: string): Promise<number> {
  const client = await getRedisClient();
  const key = `attempt:${phoneNumber}`;
  return await client.ttl(key);
}

/**
 * Redis接続をクローズ
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    redisClient.close();
    redisClient = null;
    console.log("👋 Redis connection closed");
  }
}

/**
 * ユーザーの秘密鍵を保存
 */
export async function setUserSecret(username: string, secret: string): Promise<void> {
  const client = await getRedisClient();
  const key = `secret:${username}`;
  // 秘密鍵は永続化（期限なし）
  await client.set(key, secret);
  console.log(`🔐 Secret saved for ${username}`);
}

/**
 * ユーザーの秘密鍵を取得
 */
export async function getUserSecret(username: string): Promise<string | null> {
  const client = await getRedisClient();
  const key = `secret:${username}`;
  const secret = await client.get(key);
  return secret || null;
}

/**
 * ユーザーの秘密鍵を削除
 */
export async function deleteUserSecret(username: string): Promise<void> {
  const client = await getRedisClient();
  const key = `secret:${username}`;
  await client.del(key);
  console.log(`🗑️  Secret deleted for ${username}`);
}

/**
 * ユーザーが存在するか確認
 */
export async function userExists(username: string): Promise<boolean> {
  const client = await getRedisClient();
  const key = `secret:${username}`;
  const exists = await client.exists(key);
  return exists === 1;
}

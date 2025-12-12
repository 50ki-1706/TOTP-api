import { load } from 'dotenv';

// 環境変数を読み込む
await load({ export: true });

export const config = {
  server: {
    port: parseInt(Deno.env.get('PORT') || '8000'),
    environment: Deno.env.get('ENVIRONMENT') || 'development',
  },
  redis: {
    host: Deno.env.get('REDIS_HOST') || 'localhost',
    port: parseInt(Deno.env.get('REDIS_PORT') || '6379'),
  },
  otp: {
    length: parseInt(Deno.env.get('OTP_LENGTH') || '6'),
    expirySeconds: parseInt(Deno.env.get('OTP_EXPIRY_SECONDS') || '300'),
    maxAttempts: parseInt(Deno.env.get('MAX_VERIFICATION_ATTEMPTS') || '3'),
    lockoutDuration: parseInt(Deno.env.get('LOCKOUT_DURATION_SECONDS') || '300'),
  },
};

// 設定の検証
export function validateConfig(): void {
  console.log('📋 Configuration loaded:');
  console.log(`   Environment: ${config.server.environment}`);
  console.log(`   Port: ${config.server.port}`);
  console.log(`   Redis: ${config.redis.host}:${config.redis.port}`);
  console.log(`   OTP Expiry: ${config.otp.expirySeconds}s`);
}

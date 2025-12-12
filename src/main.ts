import { Application } from 'oak';
import { config, validateConfig } from './config/env.ts';
import { authRouter } from './routes/auth.ts';
import { logger, cors, errorHandler } from './middleware/logger.ts';
import { getRedisClient, closeRedis } from './services/redis.ts';

console.log('🚀 Starting TOTP Authentication API Server...\n');

// 設定を検証
validateConfig();

// Oakアプリケーションを作成
const app = new Application();

// ミドルウェアを登録
app.use(errorHandler);
app.use(logger);
app.use(cors);

// ルートを登録
app.use(authRouter.routes());
app.use(authRouter.allowedMethods());

// 404ハンドラー
app.use((ctx) => {
  ctx.response.status = 404;
  ctx.response.body = {
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
  };
});

// Redis接続を確立
console.log('\n🔌 Initializing Redis connection...');
await getRedisClient();

// シャットダウンハンドラー
const shutdown = async () => {
  console.log('\n\n🛑 Shutting down gracefully...');
  await closeRedis();
  Deno.exit(0);
};

// シグナルハンドラーを登録
Deno.addSignalListener('SIGINT', shutdown);
Deno.addSignalListener('SIGTERM', shutdown);

// サーバー起動
console.log(`\n✅ Server is running on http://localhost:${config.server.port}`);
console.log(`\n📚 Available endpoints:`);
console.log(`   POST http://localhost:${config.server.port}/api/auth/send-otp`);
console.log(`   POST http://localhost:${config.server.port}/api/auth/verify-otp`);
console.log(`   GET  http://localhost:${config.server.port}/api/health\n`);

await app.listen({ port: config.server.port });

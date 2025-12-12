import { Context, Next } from "oak";

/**
 * リクエストロギングミドルウェア
 */
export async function logger(ctx: Context, next: Next) {
  const start = Date.now();
  
  await next();
  
  const ms = Date.now() - start;
  const status = ctx.response.status;
  
  // ステータスコードによって色を変える
  let statusColor = "";
  if (status >= 500) statusColor = "🔴";
  else if (status >= 400) statusColor = "🟡";
  else if (status >= 300) statusColor = "🔵";
  else if (status >= 200) statusColor = "🟢";
  
  console.log(
    `${statusColor} ${ctx.request.method} ${ctx.request.url.pathname} - ${status} - ${ms}ms`
  );
}

/**
 * CORS ミドルウェア
 */
export async function cors(ctx: Context, next: Next) {
  ctx.response.headers.set("Access-Control-Allow-Origin", "*");
  ctx.response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  ctx.response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  
  // OPTIONSリクエストの場合は即座に200を返す
  if (ctx.request.method === "OPTIONS") {
    ctx.response.status = 200;
    return;
  }
  
  await next();
}

/**
 * エラーハンドリングミドルウェア
 */
export async function errorHandler(ctx: Context, next: Next) {
  try {
    await next();
  } catch (err) {
    console.error("❌ Unhandled error:", err);
    
    ctx.response.status = 500;
    ctx.response.body = {
      error: "Internal server error",
      message: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

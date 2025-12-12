FROM denoland/deno:latest

# 作業ディレクトリを設定
WORKDIR /app

# 依存関係のキャッシュ用にdeno.jsonを先にコピー
COPY deno.json .

# 依存関係をキャッシュ
RUN deno cache --reload src/main.ts 2>/dev/null || true

# アプリケーションのソースコードをコピー
COPY src/ ./src/

# 依存関係を再度キャッシュ（全ファイル揃った状態で）
RUN deno cache src/main.ts

# ポートを公開
EXPOSE 8000

# アプリケーションを起動
CMD ["deno", "run", "--allow-net", "--allow-env", "--allow-read", "src/main.ts"]

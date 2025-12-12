# TOTP Authentication API (Google Authenticator)

Deno + Oak + Redis を使用した TOTP（Time-based One-Time Password）認証 API サーバー

Google Authenticator などの認証アプリに対応した 2 要素認証システムです。

## 🚀 機能

- ✅ TOTP（Time-based OTP）による 2 要素認証
- ✅ QR コード生成（Google Authenticator 対応）
- ✅ 秘密鍵の安全な保存（Redis）
- ✅ 試行回数制限とロックアウト機能
- ✅ Docker 対応
- ✅ 外部 SMS 依存なし（オフライン動作可能）

## 📋 前提条件

- Docker & Docker Compose
- スマートフォン + Google Authenticator アプリ
  - [iOS 版](https://apps.apple.com/app/google-authenticator/id388497605)
  - [Android 版](https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2)

## 🔐 TOTP とは？

TOTP（Time-based One-Time Password）は、時間ベースのワンタイムパスワード生成アルゴリズムです。

**特徴:**

- 30 秒ごとに新しい 6 桁のコードを生成
- サーバーとクライアント（Google Authenticator）が同じ秘密鍵を共有
- 時刻同期に基づいて検証
- インターネット接続不要（オフラインで動作）

**仕組み:**

```
1. サーバーが秘密鍵を生成
2. QRコードでユーザーのGoogle Authenticatorに共有
3. Google Authenticatorが30秒ごとにコードを生成
4. ユーザーがコードを入力
5. サーバーが同じアルゴリズムで検証
```

## 🛠️ セットアップ

### 1. リポジトリをクローン

```bash
git clone <repository-url>
cd totp-api
```

### 2. Docker Compose で起動

```bash
docker compose up --build
```

サーバーが起動すると:

```
✅ Server is running on http://localhost:8000

📚 Available endpoints:
   POST http://localhost:8000/api/auth/register
   POST http://localhost:8000/api/auth/verify
   POST http://localhost:8000/api/auth/get-qr
   DELETE http://localhost:8000/api/auth/user/:username
   GET  http://localhost:8000/api/health
```

## 📡 API 使用方法

### 1. ヘルスチェック

```bash
curl http://localhost:8000/api/health
```

**レスポンス:**

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "development",
  "authMethod": "TOTP (Google Authenticator)"
}
```

### 2. ユーザー登録 & QR コード生成

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice",
    "email": "alice@example.com"
  }'
```

**レスポンス:**

```json
{
  "success": true,
  "message": "Registration successful. Scan the QR code with Google Authenticator.",
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCodeUrl": "data:image/png;base64,iVBORw0KGgo...",
  "manualEntryKey": "JBSWY3DPEHPK3PXP"
}
```

**QR コードの表示方法:**

1. `qrCodeUrl`を HTML の`<img>`タグに埋め込む
2. ブラウザで開く
3. Google Authenticator で QR コードをスキャン

または、`manualEntryKey`を手動で入力することも可能です。

### 3. TOTP 検証（ログイン）

Google Authenticator に表示されている 6 桁のコードを使用:

```bash
curl -X POST http://localhost:8000/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice",
    "token": "123456"
  }'
```

**レスポンス（成功）:**

```json
{
  "success": true,
  "message": "Login successful",
  "sessionToken": "a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6",
  "user": {
    "username": "alice"
  }
}
```

**レスポンス（失敗）:**

```json
{
  "error": "Invalid token",
  "details": "2 attempts remaining"
}
```

### 4. QR コードの再取得

```bash
curl -X POST http://localhost:8000/api/auth/get-qr \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice"
  }'
```

### 5. ユーザー削除

```bash
curl -X DELETE http://localhost:8000/api/auth/user/alice
```

## 🧪 テストシナリオ

### 自動テストスクリプトを使用

```bash
./test-totp.sh
```

このスクリプトは:

1. ユーザー登録
2. QR コードを HTML ファイルとして保存
3. Google Authenticator のコードで検証
4. 試行回数制限のテスト
5. クリーンアップ

生成された `qrcode.html` をブラウザで開いて QR コードをスキャンしてください。

### 実行権限がない場合

```bash
chmod +x test-totp.sh
./test-totp.sh
```

これを先に実行してください。

### 手動テストフロー

#### ステップ 1: ユーザー登録

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser"}' | jq
```

#### ステップ 2: QR コードを HTML に保存

```bash
# QRコードURLを取得
QR_URL=$(curl -s -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "user2"}' | jq -r '.qrCodeUrl')

# HTMLファイル作成
echo "<img src='${QR_URL}' />" > qr.html

# ブラウザで開く
open qr.html  # macOS
# または
xdg-open qr.html  # Linux
```

#### ステップ 3: Google Authenticator でスキャン

1. Google Authenticator アプリを開く
2. 「+」をタップ
3. 「QR コードをスキャン」を選択
4. `qr.html`に表示された QR コードをスキャン

#### ステップ 4: コードで検証

```bash
# Google Authenticatorに表示されている6桁のコードを入力
curl -X POST http://localhost:8000/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "token": "123456"}' | jq
```

## 🔒 セキュリティ機能

### 試行回数制限

- デフォルト: 3 回まで検証試行可能
- 3 回失敗するとアカウントがロックされる
- ロックアウト時間: 300 秒（5 分）

### 時間窓（Time Window）

- デフォルト: ±30 秒の時間差を許容
- 時刻同期のズレに対応

### 秘密鍵の保存

- Redis に暗号化して保存（本番環境では暗号化推奨）
- ユーザーごとに一意の秘密鍵を生成

## 📊 Redis 構造

### 秘密鍵の保存

```
Key:   secret:alice
Value: JBSWY3DPEHPK3PXP
TTL:   永続化（期限なし）
```

### 試行回数の保存

```
Key:   attempt:alice
Value: 2
TTL:   300 seconds
```

## 🔧 開発

### ローカルで実行（Docker なし）

```bash
# Redisを起動
docker run -d -p 6379:6379 redis:alpine

# Denoでアプリを起動
deno task start
```

### ウォッチモード（ホットリロード）

```bash
deno task dev
```

## 🌐 他の認証アプリとの互換性

この API は標準的な TOTP（RFC 6238）を実装しているため、以下のアプリでも使用できます:

- ✅ Google Authenticator
- ✅ Microsoft Authenticator
- ✅ Authy
- ✅ 1Password
- ✅ Bitwarden

## 📝 環境変数

| 変数名                      | デフォルト    | 説明                                    |
| --------------------------- | ------------- | --------------------------------------- |
| `PORT`                      | 8000          | API サーバーのポート                    |
| `ENVIRONMENT`               | development   | 環境（development/production）          |
| `REDIS_HOST`                | redis         | Redis ホスト                            |
| `REDIS_PORT`                | 6379          | Redis ポート                            |
| `MAX_VERIFICATION_ATTEMPTS` | 3             | 最大検証試行回数                        |
| `LOCKOUT_DURATION_SECONDS`  | 300           | ロックアウト時間（秒）                  |
| `APP_NAME`                  | TOTP-Auth-API | アプリ名（Google Authenticator 表示用） |
| `APP_ISSUER`                | MyApp         | 発行者名                                |

## 🐳 Docker コマンド

```bash
# ビルド & 起動
docker compose up --build

# バックグラウンドで起動
docker compose up -d

# ログを表示
docker compose logs -f api
# 停止
docker compose down

# 完全削除（ボリューム含む）
docker compose down -v
```

## 🆚 SMS OTP vs TOTP

| 項目               | SMS OTP              | TOTP                   |
| ------------------ | -------------------- | ---------------------- |
| **必要なもの**     | 電話番号             | スマートフォン         |
| **外部依存**       | SMS API（Twilio 等） | なし                   |
| **コスト**         | 1 通あたり課金       | 無料                   |
| **オフライン**     | 不可                 | 可能                   |
| **セキュリティ**   | SIM swap 攻撃に脆弱  | より安全               |
| **ユーザビリティ** | 簡単                 | アプリインストール必要 |

## 📚 参考資料

- [RFC 6238 - TOTP](https://tools.ietf.org/html/rfc6238)
- [Google Authenticator](https://github.com/google/google-authenticator)
- [OTPAuth.js](https://github.com/hectorm/otpauth)
- [Deno 公式](https://deno.land/)
- [Oak Framework](https://oakserver.github.io/oak/)
- [Redis 公式](https://redis.io/)

## 📄 ライセンス

MIT

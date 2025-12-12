#!/bin/bash

# TOTP Authentication API テストスクリプト

API_URL="http://localhost:8000"
USERNAME="testuser"

echo "🧪 TOTP Authentication API テスト開始"
echo "================================"
echo ""

# ヘルスチェック
echo "📋 Test 1: ヘルスチェック"
curl -s ${API_URL}/api/health | jq
echo ""
echo ""

# ユーザー登録
echo "📋 Test 2: ユーザー登録 & QRコード生成"
REGISTER_RESPONSE=$(curl -s -X POST ${API_URL}/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"${USERNAME}\", \"email\": \"test@example.com\"}")

echo $REGISTER_RESPONSE | jq

# QRコードをHTMLファイルとして保存
QR_CODE=$(echo $REGISTER_RESPONSE | jq -r '.qrCodeUrl')
SECRET=$(echo $REGISTER_RESPONSE | jq -r '.manualEntryKey')

if [ "$QR_CODE" != "null" ]; then
  cat > qrcode.html <<EOF
<!DOCTYPE html>
<html>
<head>
  <title>Google Authenticator Setup</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 600px;
      margin: 50px auto;
      text-align: center;
    }
    .qr-container {
      border: 2px solid #ddd;
      padding: 20px;
      border-radius: 10px;
      margin: 20px 0;
    }
    .secret-key {
      background: #f5f5f5;
      padding: 10px;
      border-radius: 5px;
      font-family: monospace;
      margin: 10px 0;
    }
  </style>
</head>
<body>
  <h1>🔐 Google Authenticator Setup</h1>
  <div class="qr-container">
    <h2>Scan this QR Code</h2>
    <img src="${QR_CODE}" alt="QR Code" />
  </div>
  <div>
    <h3>Manual Entry Key</h3>
    <div class="secret-key">${SECRET}</div>
    <p>Use this key if you can't scan the QR code</p>
  </div>
  <hr>
  <h3>Instructions:</h3>
  <ol style="text-align: left;">
    <li>Install Google Authenticator app on your smartphone</li>
    <li>Open the app and tap "+" or "Add account"</li>
    <li>Scan the QR code above or enter the manual key</li>
    <li>The app will generate a 6-digit code every 30 seconds</li>
    <li>Use that code to verify your login</li>
  </ol>
</body>
</html>
EOF
  echo ""
  echo "✅ QRコードを qrcode.html に保存しました"
  echo "   ブラウザで開いてGoogle Authenticatorでスキャンしてください"
  echo ""
  echo "📱 Manual Entry Key: ${SECRET}"
fi

echo ""
echo "================================"
echo ""

# Google Authenticatorからコードを入力
read -p "📱 Google Authenticatorに表示されている6桁のコードを入力してください: " TOKEN
echo ""

# TOTP検証（ログイン）
echo "📋 Test 3: TOTP検証（ログイン）"
VERIFY_RESPONSE=$(curl -s -X POST ${API_URL}/api/auth/verify \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"${USERNAME}\", \"token\": \"${TOKEN}\"}")
echo $VERIFY_RESPONSE | jq
echo ""

# 再度検証（同じトークンは使えないことを確認）
echo "📋 Test 4: 同じトークンで再検証（失敗するはず）"
sleep 2
VERIFY_RESPONSE2=$(curl -s -X POST ${API_URL}/api/auth/verify \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"${USERNAME}\", \"token\": \"${TOKEN}\"}")
echo $VERIFY_RESPONSE2 | jq
echo ""

# QRコード再取得
echo "📋 Test 5: QRコード再取得"
GET_QR_RESPONSE=$(curl -s -X POST ${API_URL}/api/auth/get-qr \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"${USERNAME}\"}")
echo $GET_QR_RESPONSE | jq
echo ""

# 間違ったトークンで試行（試行回数制限テスト）
echo "📋 Test 6: 試行回数制限テスト（間違ったトークンで3回試行）"
for i in {1..4}
do
  echo "試行 ${i}回目（間違ったトークン: 000000）"
  VERIFY_FAIL=$(curl -s -X POST ${API_URL}/api/auth/verify \
    -H "Content-Type: application/json" \
    -d "{\"username\": \"${USERNAME}\", \"token\": \"000000\"}")
  echo $VERIFY_FAIL | jq
  echo ""
  sleep 1
done

# ユーザー削除（クリーンアップ）
echo "📋 Test 7: ユーザー削除（クリーンアップ）"
DELETE_RESPONSE=$(curl -s -X DELETE ${API_URL}/api/auth/user/${USERNAME})
echo $DELETE_RESPONSE | jq
echo ""

echo "================================"
echo "✅ テスト完了"
echo ""
echo "📄 qrcode.html をブラウザで開いてQRコードを確認できます"

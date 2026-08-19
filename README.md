# 我的自然生活（LINE 訂購／諮詢）

Next.js 後端：LINE Messaging API webhook + LIFF 訂購頁，部署於 Railway，訂單資料存 MySQL。

## 本機

1. 需要 **Node.js 22+**（`@line/bot-sdk` 要求）。
2. 依 `docs/phase-0-line-console.md` 取得 Channel Secret 與 Access Token。
3. 複製環境變數：

```bash
copy .env.example .env.local
```

4. 安裝並啟動：

```bash
npm install
npx prisma generate
npm run dev
```

- 健康檢查：http://localhost:3000/api/health
- Webhook（需 HTTPS，本機請用 ngrok 等隧道給 LINE 驗證）

有 MySQL 時：

```bash
npx prisma migrate dev --name init
```

## 設定

LINE、Railway、GitHub 的完整設定清單見 `docs/setup-checklist.md`（含每項漏掉會出現的錯誤）。

## 契約

行為以 `docs/invariants.md` 為準。

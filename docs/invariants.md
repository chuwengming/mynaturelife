# Project Invariants（可執行全局契約）

> 隨專案演進持續累積。每條應可被人工或 agent 驗證（可檢查、可回歸）。
> 最後更新：2026-08-19（Phase 2 預約表單送出即成立）

## 1. 產品流程

- [x] 使用者須加入 LINE 官方帳號「我的自然生活」為好友，或被邀請進入有此官方帳號的群組，才能互動。
- [x] 預約只經 LIFF 頁 `app/liff/booking/page.tsx` 送出；**送出即成立**（`status = confirmed`）。聊天室不直接寫入預約列。
- [x] 群組或 1:1 文字提問：先由 AI 判斷 `booking` / `consultation` / `other`。`booking` 回 LIFF 連結；`consultation` 先短回再查知識庫；`other`（寒暄）短固定回覆，不開表單、不查 wiki。
- [x] 真正寫入預約仍只發生在 LIFF 送出，避免分類誤判插入資料。

## 2. 模式／分支（若有多模式、多角色、多入口）

- [x] 雙入口共用同一套後端與 `line_user_id`：1:1 回覆／Push 目標為該 `userId`；群組為該 `groupId`。
- [x] 多使用者並行：每筆預約綁 `line_user_id`，不得使用「目前使用者」全域變數。
- [x] LIFF 送出時後端須驗證 LINE ID Token，不得信任表單自填的 userId。`POST /api/bookings` 為唯一寫入點，成功列 `status = confirmed`。
- [ ] Phase 3 起意圖分類由 AI 執行（Phase 2：傳「預約」回 LIFF 按鈕；傳「我的ID」回 userId；其餘引導去預約）。

## 3. 環境與銜接（mock / simulation / real）

- [x] Messaging API 金鑰：`LINE_CHANNEL_SECRET`、`LINE_CHANNEL_ACCESS_TOKEN`。LIFF 另需 **LINE Login** Channel：`LINE_LOGIN_CHANNEL_ID`、`LINE_LOGIN_CHANNEL_SECRET`。兩組不可混用。禁止寫死在 repo。
- [x] `NEXT_PUBLIC_LINE_LIFF_ID` 來自 Login（或已啟用 Login 的）Channel → LIFF 分頁建立 App 後顯示的 LIFF ID。
- [x] `ADMIN_LINE_USER_IDS` 是管理員的 Messaging API `userId`（`U` 開頭），不是 Channel ID；Phase 1 在 1:1 傳「我的ID」可查詢。
- [x] Webhook 路徑固定：`POST /api/line/webhook`。正式 URL：`https://web-production-1ee6b.up.railway.app/api/line/webhook`。
- [x] LIFF Endpoint 路徑固定：`/liff/booking`。正式 URL：`https://web-production-1ee6b.up.railway.app/liff/booking`。
- [x] 知識庫後期接 LLM-Wiki（先 `index.md` 再讀 2–5 頁），經 `retrieve(question)` 介面；Phase 1 不呼叫。
- [x] 無 `DATABASE_URL` 時 webhook 仍可驗簽與回覆，但**略過去重**（僅本機過渡，正式環境必須有 MySQL）。

## 4. 資料與設定

- [x] Railway MySQL 為預約與 webhook 去重的權威來源。
- [x] `processed_events.webhook_event_id` 唯一；同一事件重送不得重複 Reply／重複開 AI。
- [x] 預約欄位（v1）：姓名、聯絡電話、**預約日期**、**預約時段**、**預約項目**、備註（選填）。不含「想討論的內容」「是否首次諮詢」。
- [x] v1 不做時段庫存；預約時段為偏好紀錄，不保證獨佔。

## 5. UI／跨頁／跨模組契約

- [x] Next.js 同時提供 Webhook 與 LIFF 頁。
- [x] Messaging Secret／Access Token 與 LINE Login Secret 只在 server；僅 `NEXT_PUBLIC_LINE_LIFF_ID` 可進 LIFF 頁。
- [x] LIFF 在外部瀏覽器以 `withLoginOnExternalBrowser` 初始化；`liff.init` 全程只呼叫一次，避免 React 重複掛載導致失敗。

## 6. 禁止破壞（含已修回歸）

- [x] 未通過 `X-Line-Signature`（HMAC-SHA256、raw body）不得處理事件；失敗回 401。
- [x] 驗簽後業務／AI 失敗仍回 HTTP 200，避免 LINE 重送同一事件。
- [x] Webhook 必須在約 1 秒內回 200；慢工作（AI、Wiki、搜尋）不得擋在 200 之前。
- [x] Reply Token 一次性；長回答改用 Push Message。群組互動 Push 到 groupId，不要只推給個人。
- [x] 不得把 Channel Secret／Access Token 打進前端 bundle。

## 7. 待確認

- [x] 預約時段選項：上午／下午／晚上（值：morning / afternoon / evening）。
- [x] 預約項目選項：生活型態、飲食營養、身心調理、環境與自然、其他。
- [ ] LLM-Wiki 部署位置與 `retrieve` HTTP 契約。
- [ ] 群組是否收全部訊息，或僅 mention 才處理（依 LINE Console 設定）。

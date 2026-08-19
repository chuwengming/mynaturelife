# Project Invariants（可執行全局契約）

> 隨專案演進持續累積。每條應可被人工或 agent 驗證（可檢查、可回歸）。
> 最後更新：2026-08-19（Phase 2.1 預約 → 訂購：豆腐乳訂單表單）

## 1. 產品流程

- [x] 使用者須加入 LINE 官方帳號「我的自然生活」為好友，或被邀請進入有此官方帳號的群組，才能互動。
- [x] 全站對外用語為「訂購／訂單」，不再使用「預約」。表單標題為「訂購表單」。
- [x] 訂單只經 LIFF 頁 `app/liff/booking/page.tsx` 送出；**通過驗證即成立**（`status = confirmed`）。聊天室不直接寫入訂單列。
- [x] 群組或 1:1 文字提問：先由 AI 判斷 `order` / `consultation` / `other`。`order` 回 LIFF 連結；`consultation` 先短回再查知識庫；`other`（寒暄）短固定回覆，不開表單、不查 wiki。
- [x] 真正寫入訂單仍只發生在 LIFF 送出，避免分類誤判插入資料。

## 2. 模式／分支（若有多模式、多角色、多入口）

- [x] 雙入口共用同一套後端與 `line_user_id`：1:1 回覆／Push 目標為該 `userId`；群組為該 `groupId`。
- [x] 多使用者並行：每筆訂單綁 `line_user_id`，不得使用「目前使用者」全域變數。
- [x] LIFF 送出時後端須驗證 LINE ID Token，不得信任表單自填的 userId。`POST /api/orders` 為唯一寫入點（舊 `POST /api/bookings` 已移除），成功列 `status = confirmed`。
- [ ] Phase 3 起意圖分類由 AI 執行（Phase 2：傳「訂購」回 LIFF 按鈕；傳「我的ID」回 userId；其餘引導去訂購）。
- [x] Webhook 觸發表單的關鍵字：`訂購`、`訂單`，並保留 `預約` 作相容關鍵字（舊訊息／舊按鈕仍可用）。

## 3. 環境與銜接（mock / simulation / real）

- [x] 外部後台（LINE／Railway）所有必要設定集中於 `docs/setup-checklist.md`，為設定的權威來源；新發現的設定項或錯誤成因須同輪補入。

- [x] Messaging API 金鑰：`LINE_CHANNEL_SECRET`、`LINE_CHANNEL_ACCESS_TOKEN`。LIFF 另需 **LINE Login** Channel：`LINE_LOGIN_CHANNEL_ID`、`LINE_LOGIN_CHANNEL_SECRET`。兩組不可混用。禁止寫死在 repo。
- [x] `NEXT_PUBLIC_LINE_LIFF_ID` 來自 Login（或已啟用 Login 的）Channel → LIFF 分頁建立 App 後顯示的 LIFF ID。
- [x] `ADMIN_LINE_USER_IDS` 是管理員的 Messaging API `userId`（`U` 開頭），不是 Channel ID；Phase 1 在 1:1 傳「我的ID」可查詢。
- [x] Webhook 路徑固定：`POST /api/line/webhook`。正式 URL：`https://web-production-1ee6b.up.railway.app/api/line/webhook`。
- [x] LIFF Endpoint 路徑固定：`/liff/booking`。正式 URL：`https://web-production-1ee6b.up.railway.app/liff/booking`。**即使改名為訂購也不得更動此路徑**，否則 LINE Console 的 LIFF Endpoint 需重設並會出現 `INVALID_CONFIG`。
- [x] 知識庫後期接 LLM-Wiki（先 `index.md` 再讀 2–5 頁），經 `retrieve(question)` 介面；Phase 1 不呼叫。
- [x] 無 `DATABASE_URL` 時 webhook 仍可驗簽與回覆，但**略過去重**（僅本機過渡，正式環境必須有 MySQL）。

## 4. 資料與設定

- [x] Railway MySQL 為訂單與 webhook 去重的權威來源。
- [x] `processed_events.webhook_event_id` 唯一；同一事件重送不得重複 Reply／重複開 AI。
- [x] 訂單資料表為 `orders`（舊 `bookings` 由遷移 `20260819110000_bookings_to_orders` 更名，欄位 `booking_date`→`order_date`、`booking_item`→`order_item`，刪 `booking_slot`，新增 `plain_qty`、`spicy_qty`、`address`）。不得再新增 `bookings` 相關程式路徑。
- [x] 訂購欄位（v2）：姓名、聯絡電話、訂購日期、訂購項目、原味數量、辣味數量、地址、備註（選填）。**無時段欄位**。
- [x] 訂購日期允許「今天或之後」（台北時區），不得早於今天。

## 5. UI／跨頁／跨模組契約

- [x] Next.js 同時提供 Webhook 與 LIFF 頁。
- [x] Messaging Secret／Access Token 與 LINE Login Secret 只在 server；僅 `NEXT_PUBLIC_LINE_LIFF_ID` 可進 LIFF 頁。
- [x] LIFF 在外部瀏覽器以 `withLoginOnExternalBrowser` 初始化；`liff.init` 全程只呼叫一次，避免 React 重複掛載導致失敗。
- [x] LIFF Scope 只要求 **openid**；`profile` 為選配，`getProfile()` 失敗不得中斷訂購表單（顯示名稱僅用於預填）。
- [x] 訂購表單最上方必須顯示：`* 訂購6罐(含)以上者可以宅配(運費另計)，務必填寫地址`。
- [x] 1:1 新訂單除回使用者外，應 Push 給 `ADMIN_LINE_USER_IDS`（Phase 2）。通知內容含項目、兩種口味數量、合計、地址（若有）。
- [x] LIFF 錯誤訊息須標明失敗階段（init／login／profile）與 LINE 原始 code，便於排查。

## 6. 禁止破壞（含已修回歸）

- [x] 未通過 `X-Line-Signature`（HMAC-SHA256、raw body）不得處理事件；失敗回 401。
- [x] 驗簽後業務／AI 失敗仍回 HTTP 200，避免 LINE 重送同一事件。
- [x] Webhook 必須在約 1 秒內回 200；慢工作（AI、Wiki、搜尋）不得擋在 200 之前。
- [x] Reply Token 一次性；長回答改用 Push Message。群組互動 Push 到 groupId，不要只推給個人。
- [x] 不得把 Channel Secret／Access Token 打進前端 bundle。
- [x] **訂單成立條件**（任一不符即不得寫入資料庫，並須把原因回饋給使用者）：姓名有值；電話有值且格式有效；訂購項目有值；`原味數量` 與 `辣味數量` 至少一欄為大於 0 的整數。驗證邏輯集中在 `lib/order/validate.ts`，前端與 API 共用同一份。
- [x] 合計數量 ≥ 6 時地址為必填（源自表單宅配註記）；不足時同樣不建立訂單並說明原因。
- [x] 驗證失敗時 `POST /api/orders` 回 400 並附中文原因清單，不得產生任何 `orders` 資料列。

## 7. 待確認

- [x] 訂購項目選項：豆腐乳(原味) / 豆腐乳(辣味)（值：tofu_curd_plain / tofu_curd_spicy）。
- [ ] 「訂購項目」與兩個數量欄位語意重疊：目前項目僅作主要品項紀錄，數量以兩個欄位為準，不檢查兩者一致性。若需改為「所選項目數量必須 > 0」請告知。
- [ ] 單筆數量上限暫定每種口味 999；是否需要更嚴格上限或庫存檢查待確認。
- [ ] LLM-Wiki 部署位置與 `retrieve` HTTP 契約。
- [ ] 群組是否收全部訊息，或僅 mention 才處理（依 LINE Console 設定）。

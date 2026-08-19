# 完整設定清單（LINE / Railway / GitHub）

一份到位的設定總表。**所有**需要人工在後台點選的項目都列在這裡，含「為什麼需要」與「漏了會出現什麼錯誤」。
金鑰值不寫在本檔，只寫變數名稱與取得位置。

最後驗證：2026-08-19

---

## 0. 專案固定事實

| 項目 | 值 |
|---|---|
| 官方帳號 | 我的自然生活（`@onw9687d`） |
| GitHub | `chuwengming/mynaturelife`（分支 `master`） |
| Railway 專案 | Line Reservation |
| Railway 服務 | `web`（Next.js）、`MySQL` |
| 公開網域 | `https://web-production-1ee6b.up.railway.app` |
| Webhook URL | `https://web-production-1ee6b.up.railway.app/api/line/webhook` |
| LIFF Endpoint | `https://web-production-1ee6b.up.railway.app/liff/booking` |
| LIFF ID | `2011165611-aEsHcumH` |
| LINE Login Channel ID | `2011165611` |

LIFF ID 的數字段必須等於 Login Channel ID；不相等表示 LIFF 建在別的 Channel 下。

---

## 1. LINE Developers：Messaging API Channel

位置：[LINE Developers Console](https://developers.line.biz/console/) → Provider → Messaging API Channel「我的自然生活」

| 設定 | 要求值 | 漏掉的後果 |
|---|---|---|
| Basic settings → **Channel secret** | 複製到 `LINE_CHANNEL_SECRET` | webhook 驗簽永遠 401 |
| Messaging API → **Channel access token（長期）** | 複製到 `LINE_CHANNEL_ACCESS_TOKEN` | 無法 Reply／Push（401） |
| Messaging API → **Use webhook** | **開啟** | LINE 不送事件，Bot 完全不回應 |
| Messaging API → **Webhook URL** | 上表 Webhook URL，按 **Verify** 需成功 | 同上 |
| Messaging API → **Allow bot to join group chats** | **開啟** | 無法把 Bot 拉進群組 |
| Basic settings → **Your user ID** | 應看得到（`U` 開頭） | 看不到表示 Business ID 未綁 LINE 帳號 |

目前實測：Webhook endpoint 已設定且 `active = true`。

---

## 2. LINE Official Account Manager

位置：[manager.line.biz](https://manager.line.biz/) → 我的自然生活 → 設定

| 設定 | 建議值 | 說明 |
|---|---|---|
| 回應模式 / Response mode | **Bot（聊天機器人）** | 設成「聊天」時，自動回應與人工聊天可能與 Bot 搶答 |
| 自動回應訊息 | **關閉** | 否則客人會同時收到罐頭訊息與 Bot 回覆 |
| 關鍵字回應 | **關閉**（測試期） | 同上 |
| 加入群組 | 已把官方帳號拉進專設群組 | 群組入口需要 |

目前實測：`chatMode = chat`。若日後 Bot 回覆變得不穩定或被罐頭訊息蓋過，先來看這一項。

---

## 3. LINE Developers：LINE Login Channel

LIFF **掛在 LINE Login**，不是掛在 Messaging API。兩者必須在**同一個 Provider** 下。

| 設定 | 要求值 | 漏掉的後果 |
|---|---|---|
| **Use LINE Login in your web app** | **開啟** | LIFF 無法啟動登入 |
| **OpenID Connect** | 開啟 | 拿不到 ID Token，後端無法驗身份 |
| **Callback URL** | `https://liff.line.me`<br>`https://web-production-1ee6b.up.railway.app` | 外部瀏覽器登入被擋 |
| **Linked LINE Official Account** | 連到「我的自然生活」 | LIFF 的 Add friend option 非 Off 時，`liff.init` 可能回 `FORBIDDEN` |
| Channel ID / Channel secret | `LINE_LOGIN_CHANNEL_ID` / `LINE_LOGIN_CHANNEL_SECRET` | 後端無法驗 ID Token |
| **狀態 Developing / Published** | 自己測 → Developing 即可；開放給客人 → **Published** | Developing 時只有 Admin／Tester 且**已綁定 LINE 帳號**的人能登入，其他人 `FORBIDDEN`。Published 後**不能改回** |
| Roles | 自己為 Admin 或 Tester | 同上 |

### Business ID 綁定 LINE 帳號（Developing 測試必備）

Console 沒有「Link LINE account」按鈕，路徑是：右上頭像 → 帳號資訊 → **Go to Business ID Profile** → **LINE 帳號** 區塊 → 點連結圖示 → 用手機測試用的那個 LINE 登入。
驗證方式：Channel 的 Basic settings 出現 **Your user ID**。

---

## 4. LINE Developers：LIFF App

位置：Login Channel → **LIFF** 分頁

| 設定 | 要求值 | 漏掉的後果 |
|---|---|---|
| **Endpoint URL** | `https://web-production-1ee6b.up.railway.app/liff/booking` | `INVALID_CONFIG`／頁面無法初始化 |
| **Size** | Tall 或 Full（目前 `full`） | 版面過小 |
| **Scope：openid** | 必要 | 拿不到 ID Token，送出訂單失敗 |
| **Scope：profile** | 建議勾 | 不勾則 `liff.getProfile()` 回 **`FORBIDDEN`**（無法自動帶入姓名；表單仍可用） |
| **Add friend option（botPrompt）** | 不需要引導加好友就設 **Off**；設 normal／aggressive 時必須有 Linked OA | `FORBIDDEN`（No bot could be resolved） |
| LIFF ID | 複製到 `NEXT_PUBLIC_LINE_LIFF_ID` | 頁面顯示未設定 LIFF ID |

目前實測：`scope = ["openid"]`（缺 profile）、`botPrompt = "normal"`、`view.type = full`、Endpoint 正確。

改名為「訂購」後 **不需要改任何 LINE Console 設定**：表單路徑刻意保留 `/liff/booking`，只有頁面文字與 API（`/api/orders`）改名。若日後想改成 `/liff/order`，必須同步改 LIFF Endpoint URL，否則會出現 `INVALID_CONFIG`。

開啟方式：使用者端網址為 `https://liff.line.me/2011165611-aEsHcumH`；請用**手機 LINE App** 從聊天室開啟，不要用 IDE 內嵌預覽（iframe 會被拒）。

---

## 5. Railway

| 項目 | 設定 |
|---|---|
| 專案 | Line Reservation |
| 服務 `web` | Source＝GitHub `chuwengming/mynaturelife`，分支 `master`；有公開網域 |
| 服務 `MySQL` | 官方 MySQL 模板（含 volume） |
| Healthcheck | `/api/health`（`railway.toml`） |
| 啟動指令 | `npx prisma migrate deploy && npm start`（`railway.toml`） |

### `web` 服務的環境變數

| 變數 | 來源 | 必要性 |
|---|---|---|
| `LINE_CHANNEL_SECRET` | Messaging API → Basic settings | 必要 |
| `LINE_CHANNEL_ACCESS_TOKEN` | Messaging API → 長期 token | 必要 |
| `LINE_LOGIN_CHANNEL_ID` | Login Channel → Basic settings | 必要（驗 ID Token） |
| `LINE_LOGIN_CHANNEL_SECRET` | Login Channel → Basic settings | 必要 |
| `NEXT_PUBLIC_LINE_LIFF_ID` | Login Channel → LIFF 分頁 | 必要 |
| `DATABASE_URL` | 設為參照 `${{MySQL.MYSQL_URL}}` | 必要 |
| `ADMIN_LINE_USER_IDS` | 在 1:1 傳「我的ID」取得 | 選配（管理員通知） |

重點：**本機 `.env.local` 不會自動同步到 Railway**，兩邊都要填。`DATABASE_URL` 請用服務參照而非貼死字串，MySQL 換密碼時才不會斷。

後續階段會用到（Phase 3–4，先知道即可）：AI 供應商 API key、LLM-Wiki 的 `retrieve` 服務網址與金鑰、網路搜尋 API key。

---

## 6. 驗證步驟（每次改設定後跑一次）

1. `https://web-production-1ee6b.up.railway.app/api/health` → 各項旗標皆為 `true`。
2. LINE Console 按 **Verify** → 成功。
3. 1:1 傳任意文字 → Bot 有回覆。
4. 1:1 傳「我的ID」 → 回傳 `U…`。
5. 傳「訂購」 → 出現按鈕 → 開啟訂購表單 → 填數量後送出 → 聊天室收到「訂單已成立」。
6. 需要時查 Railway log：`railway logs --service web --deployment --lines 100`。

---

## 7. 錯誤代碼對照

| 現象 | 真正原因 | 處理 |
|---|---|---|
| Verify 失敗 | Webhook URL 錯、服務未啟動、Secret 未設 | 查 `/api/health` 與 Railway 部署狀態 |
| webhook 回 401 | `LINE_CHANNEL_SECRET` 不符 | 重新複製 Secret 到 Railway |
| LIFF `FORBIDDEN`（init 階段） | Login Channel 為 Developing 而帳號未綁定／非 Admin-Tester；或 botPrompt 非 Off 但沒連 OA；或在 iframe 內開啟 | 綁定 Business ID↔LINE、設 Add friend option 為 Off、用手機 LINE 開啟 |
| LIFF `FORBIDDEN`（profile 階段） | LIFF Scope 缺 `profile` | 加勾 profile（不加也能訂購，只是不自動帶名字） |
| `INVALID_LIFF_ID` | `NEXT_PUBLIC_LINE_LIFF_ID` 錯或未設 | 核對 LIFF 分頁的 ID |
| `INVALID_CONFIG` | 目前網址與 Endpoint URL 不一致 | 修正 LIFF Endpoint |
| 送出訂單時「取不到登入憑證」 | Scope 缺 `openid` | 加勾 openid |
| 送出後 503 | `DATABASE_URL` 未設或 MySQL 未啟動 | 檢查 Railway 變數參照與 MySQL 服務 |

---

## 8. 安全注意

- `LINE_CHANNEL_SECRET`、`LINE_CHANNEL_ACCESS_TOKEN`、`LINE_LOGIN_CHANNEL_SECRET`、`DATABASE_URL` 僅存在於 Railway Variables 與本機 `.env.local`（已 gitignore）。
- 只有 `NEXT_PUBLIC_LINE_LIFF_ID` 可進前端。
- `railway variable list` 會印出明文，輸出不要外流或貼到公開處。

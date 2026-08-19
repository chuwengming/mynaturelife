# Phase 0：你需要在 LINE Developers 完成的事

此階段無法由程式代勞。完成後把 Secret／Token 填進本機 `.env.local`（以及之後的 Railway Variables）。**不要貼到聊天或 commit。**

Messaging API 的 Channel secret、Channel access token 若已填好，下面從 **LINE Login／LIFF** 與 **管理員 userId** 繼續即可。

## Messaging API（若尚未做）

1. 開啟 [LINE Developers Console](https://developers.line.biz/console/)。
2. 選或建立 Provider，建立（或開啟既有）Messaging API Channel，名稱：**我的自然生活**。
3. **Basic settings**：複製 **Channel secret** → `LINE_CHANNEL_SECRET`
4. **Messaging API**
   - 發行 **Channel access token（長期）** → `LINE_CHANNEL_ACCESS_TOKEN`
   - 開啟 **Allow bot to join group chats**
   - Webhook URL 填：`https://web-production-1ee6b.up.railway.app/api/line/webhook`
5. [LINE Official Account Manager](https://manager.line.biz/)：測試期建議關掉會跟 Bot 搶答的自動回應；加好友並拉進專設群組。

## LINE Login（LIFF 的前置，現在就可以做）

LIFF 掛在 **LINE Login**，不是掛在 Messaging API 的 Secret／Token 上。兩者要在**同一個 Provider** 底下。

1. 同一 Provider → **Create a new channel** → 選 **LINE Login**（名稱可用「我的自然生活 Login」）。
2. 應用類型選 **Web app**。
3. 打開該 Login Channel 的 **LINE Login** 分頁：
   - 狀態可先維持 Developing（測試用）。Developing 時**只有 Admin／Tester 且 LINE 帳號已綁定該開發者**才能登入；一般好友會得到 FORBIDDEN。要給所有使用者預約，需把 LINE Login Channel 改為 **Published**（發布後不能改回 Developing）。
   - 開啟 **OpenID Connect**（之後驗證 LIFF ID Token 需要 `openid`）。
   - **Callback URL** 請加入（缺一不可）：
     - `https://liff.line.me`
     - `https://web-production-1ee6b.up.railway.app`
   - 權限／Scope：至少 **profile**、**openid**。
4. 若 Console 提供「連結官方帳號」，請連到 **我的自然生活**，讓使用者從 LIFF 可被引導加好友。
5. Login Channel 另有自己的 **Channel ID** 與 **Channel secret**（和 Messaging API 那組不同）：
   - `LINE_LOGIN_CHANNEL_ID`
   - `LINE_LOGIN_CHANNEL_SECRET`  
   這兩項給**伺服器驗證 ID Token**用，不要加 `NEXT_PUBLIC_` 前綴。

若你是在 Messaging API Channel 裡看到「要先完成 LINE Login 才能加入 LIFF」：依畫面上的 **LINE Login 設定** 走完，效果與「另建 Login Channel」相同——重點是 Login 必須啟用，LIFF 分頁才會解鎖。

## 如何取得 `NEXT_PUBLIC_LINE_LIFF_ID`

LIFF 的 **Endpoint URL** 必須是 **https**，且對應 Next.js 頁面：

```
https://<公開網域>/liff/booking
```

對應程式：`app/liff/booking/page.tsx`。  
**不能填** `http://localhost:3000/liff/booking`（LINE 不接受 http／本機）。

Railway 正式網域還沒有時，仍可先填一個之後會改的 HTTPS（申請當下通常不檢查網頁是否已上線），例如：

```
https://web-production-1ee6b.up.railway.app/liff/booking
```

上線後到 LIFF 設定把 Endpoint 改成真正的 `https://web-production-1ee6b.up.railway.app/liff/booking`。**LIFF ID 建立後不會因改 Endpoint 而變。**

1. 進入 **LINE Login Channel**（或已解鎖 LIFF 的那個 Channel）→ **LIFF** 分頁 → **Add**。
2. 填寫：
   - Size：**Tall** 或 **Full**
   - Endpoint URL：上面的 `https://…/liff/booking`
   - Scope：勾 **profile**、**openid**（送出預約時後端要驗 ID Token）。
3. 建立後，列表／設定頁會顯示 **LIFF ID**，格式類似：`1234567890-AbCdEfGh`。
4. 這個字串就是 `NEXT_PUBLIC_LINE_LIFF_ID`。對使用者的開啟網址是：`https://liff.line.me/<LIFF_ID>`。

## 如何取得 `ADMIN_LINE_USER_IDS`

這不是 Channel Secret，也不是 LIFF ID。它是**管理員本人的 LINE userId**（Messaging API 的使用者識別，形如 `U` 開頭再加 32 位英數）。用來在使用者 1:1 預約成功時，把通知 Push 給你。

Console **不會**列出所有好友的 userId，請用下面任一方式：

### 方式 A（建議，Webhook 通了之後）

1. 用**你自己的 LINE** 把「我的自然生活」加為好友。
2. 在**一對一**聊天傳：`我的ID`
3. Bot 會回你的 userId，整段貼進 `ADMIN_LINE_USER_IDS`。
4. 多位管理員：請對方同樣傳一次，用英文逗號串起來，例如 `Uaaa...,Ubbb...`

尚未設定 Webhook 前，這個指令不會有反應。

### 方式 B

Webhook 連上後，Railway／本機 log 裡每個事件的 `source.userId` 就是傳訊者的 ID。你傳一則測試訊息，把 log 裡自己的 `userId` 抄下來。

群組訊息裡有時也帶 `userId`，但請以**加好友後的 1:1** 為準，Push 管理員通知才穩定。

## 等 Railway 網址出來後再做

- 填 Messaging API Webhook URL 並按 **Verify**。
- 把 LIFF Endpoint 改成 `https://<網域>/liff/booking`。
- Callback URL 加上同一個網域 origin。

## 本機對應檔

複製 `.env.example` 為 `.env.local`。現階段至少要有 Messaging 的 Secret 與 Token；Login／LIFF／Admin 可隨你完成 Console 步驟再補。

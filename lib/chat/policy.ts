/** 純聊天最多幾輪；問產品、問訂購都不計入。 */
export const SMALLTALK_TURN_LIMIT = 6;

/** 禮貌收尾後的冷靜期：期間只回應明確提到訂購的訊息。 */
export const COOLDOWN_MS = 2 * 60 * 60 * 1000;

export const CLOSING_MESSAGE =
  "很開心跟你聊這些！不好意思，我這邊還要照顧其他客人，先跟你說聲抱歉。之後想訂豆腐乳的話，隨時傳「訂購」給我，我會馬上幫你處理。祝你有個順心的一天。";

export const ORDER_INVITE_MESSAGE =
  "好的，這就幫你準備訂購表單。點下面的按鈕填寫，送出後訂單就成立了。";

export const AI_UNAVAILABLE_MESSAGE =
  "不好意思，我這邊系統忙碌了一下。若你想訂購豆腐乳，請傳「訂購」，我立刻幫你準備表單；其他問題我也會請專人回覆你。";

export function isInCooldown(closedAt: Date | null, now = new Date()): boolean {
  if (!closedAt) {
    return false;
  }
  return now.getTime() - closedAt.getTime() < COOLDOWN_MS;
}

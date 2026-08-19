import type { webhook } from "@line/bot-sdk";
import { claimWebhookEvent } from "@/lib/line/idempotency";
import { replyText } from "@/lib/line/client";

const PHASE1_REPLY =
  "你好，我是「我的自然生活」。連線已成功。預約表單與諮詢回覆會在後續階段開放，先謝謝你。\n\n若要查自己的 LINE userId（設定管理員通知用），請傳：我的ID";

function hasReplyToken(
  event: webhook.Event,
): event is webhook.Event & { replyToken: string } {
  return "replyToken" in event && typeof event.replyToken === "string";
}

function getMessageText(event: webhook.Event): string | null {
  if (event.type !== "message" || event.message.type !== "text") {
    return null;
  }
  return event.message.text.trim();
}

function getSourceUserId(event: webhook.Event): string | null {
  const userId = event.source?.userId;
  return userId || null;
}

function isLookupMyId(text: string): boolean {
  const normalized = text.replace(/\s+/g, "").toLowerCase();
  return normalized === "我的id" || normalized === "/id";
}

export async function handleWebhookEvents(
  events: webhook.Event[],
): Promise<void> {
  for (const event of events) {
    const claimed = await claimWebhookEvent(event.webhookEventId);
    if (!claimed) {
      continue;
    }

    if (event.type === "message" && hasReplyToken(event)) {
      const text = getMessageText(event);
      const reply = isLookupMyId(text ?? "")
        ? formatUserIdReply(getSourceUserId(event))
        : PHASE1_REPLY;

      try {
        await replyText(event.replyToken, reply);
      } catch (error) {
        console.error("LINE reply failed", { webhookEventId: event.webhookEventId, error });
      }
    }
  }
}

function formatUserIdReply(userId: string | null): string {
  if (!userId) {
    return "目前拿不到你的 userId。請先把「我的自然生活」加為好友後，在一對一聊天再傳一次：我的ID";
  }
  return `你的 LINE userId：\n${userId}\n\n請把這個值填進 ADMIN_LINE_USER_IDS（多位管理員用逗號分隔）。`;
}

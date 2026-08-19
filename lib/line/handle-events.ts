import type { webhook } from "@line/bot-sdk";
import { claimWebhookEvent } from "@/lib/line/idempotency";
import { replyText } from "@/lib/line/client";
import { bookingButtonMessage } from "@/lib/line/liff-link";
import { replyMessages } from "@/lib/line/messages";

const FALLBACK_REPLY =
  "你好，我是「我的自然生活」。\n\n預約請傳「預約」，或點我們寄給你的表單連結。送出即成立。\n一般諮詢回覆會在下一階段開放。\n\n查自己的 LINE userId 請傳：我的ID";

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
  return event.source?.userId || null;
}

function isLookupMyId(text: string): boolean {
  const normalized = text.replace(/\s+/g, "").toLowerCase();
  return normalized === "我的id" || normalized === "/id";
}

function isBookingRequest(text: string): boolean {
  return text.includes("預約") && !isLookupMyId(text);
}

export async function handleWebhookEvents(
  events: webhook.Event[],
): Promise<void> {
  for (const event of events) {
    const claimed = await claimWebhookEvent(event.webhookEventId);
    if (!claimed) {
      continue;
    }

    if (event.type !== "message" || !hasReplyToken(event)) {
      continue;
    }

    const text = getMessageText(event);
    try {
      if (isLookupMyId(text ?? "")) {
        await replyText(event.replyToken, formatUserIdReply(getSourceUserId(event)));
        continue;
      }
      if (text && isBookingRequest(text)) {
        await replyMessages(event.replyToken, [bookingButtonMessage()]);
        continue;
      }
      await replyText(event.replyToken, FALLBACK_REPLY);
    } catch (error) {
      console.error("LINE reply failed", { webhookEventId: event.webhookEventId, error });
    }
  }
}

function formatUserIdReply(userId: string | null): string {
  if (!userId) {
    return "目前拿不到你的 userId。請先把「我的自然生活」加為好友後，在一對一聊天再傳一次：我的ID";
  }
  return `你的 LINE userId：\n${userId}`;
}

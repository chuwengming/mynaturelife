import type { messagingApi, webhook } from "@line/bot-sdk";
import { classifyIntent, type Intent } from "@/lib/ai/classify";
import { answerProductQuestion, answerSmalltalk } from "@/lib/ai/reply";
import {
  loadConversation,
  recentHistory,
  recordMessage,
  updateConversation,
  type ConversationKind,
} from "@/lib/chat/conversation";
import { isLookupMyId, mentionsOrder } from "@/lib/chat/keywords";
import {
  CLOSING_MESSAGE,
  ORDER_INVITE_MESSAGE,
  SMALLTALK_TURN_LIMIT,
  isInCooldown,
} from "@/lib/chat/policy";
import { claimWebhookEvent } from "@/lib/line/idempotency";
import { orderButtonMessage } from "@/lib/line/liff-link";
import { pushText, replyMessages } from "@/lib/line/messages";

const WELCOME_MESSAGE =
  "你好，我是「我的自然生活」的客服。我們做手工豆腐乳（原味、辣味）。想訂購請傳「訂購」，我會給你訂購表單；有任何問題也歡迎直接問我。";

type Conversation = { key: string; kind: ConversationKind };

function textMessage(text: string): messagingApi.TextMessage {
  return { type: "text", text };
}

function getConversation(event: webhook.Event): Conversation | null {
  const source = event.source;
  if (!source) {
    return null;
  }
  if (source.type === "group" && source.groupId) {
    return { key: source.groupId, kind: "group" };
  }
  if (source.type === "room" && source.roomId) {
    return { key: source.roomId, kind: "room" };
  }
  if (source.userId) {
    return { key: source.userId, kind: "user" };
  }
  return null;
}

/** Reply token 可能因為處理較久而失效，此時改用 Push 送到同一個對話。 */
async function respond(
  replyToken: string,
  conversationKey: string,
  messages: messagingApi.Message[],
): Promise<void> {
  try {
    await replyMessages(replyToken, messages);
  } catch (error) {
    console.error("reply failed, falling back to push", error);
    for (const message of messages) {
      if (message.type === "text") {
        await pushText(conversationKey, message.text);
      }
    }
  }
}

function formatUserIdReply(userId: string | null): string {
  if (!userId) {
    return "目前拿不到你的 userId。請先把「我的自然生活」加為好友後，在一對一聊天再傳一次：我的ID";
  }
  return `你的 LINE userId：\n${userId}`;
}

async function handleOrderIntent(
  replyToken: string,
  conversation: Conversation,
): Promise<void> {
  await updateConversation(conversation.key, {
    smalltalkTurns: 0,
    lastIntent: "order",
    closedAt: null,
  });
  await respond(replyToken, conversation.key, [
    textMessage(ORDER_INVITE_MESSAGE),
    orderButtonMessage(),
  ]);
  await recordMessage(conversation.key, "assistant", ORDER_INVITE_MESSAGE, "order");
}

async function handleTextMessage(
  event: webhook.MessageEvent & { replyToken: string },
  text: string,
): Promise<void> {
  const conversation = getConversation(event);
  if (!conversation) {
    return;
  }

  if (isLookupMyId(text)) {
    await respond(event.replyToken, conversation.key, [
      textMessage(formatUserIdReply(event.source?.userId ?? null)),
    ]);
    return;
  }

  const state = await loadConversation(conversation.key, conversation.kind);

  // 收尾後的冷靜期：只回應明確提到訂購的訊息，其餘保持安靜。
  if (isInCooldown(state.closedAt)) {
    if (mentionsOrder(text)) {
      await recordMessage(conversation.key, "user", text, "order");
      await handleOrderIntent(event.replyToken, conversation);
    }
    return;
  }

  const history = await recentHistory(conversation.key);
  const intent: Intent = await classifyIntent(text, history);
  await recordMessage(conversation.key, "user", text, intent);

  if (intent === "order") {
    await handleOrderIntent(event.replyToken, conversation);
    return;
  }

  if (intent === "product") {
    const answer = await answerProductQuestion(text, history);
    await updateConversation(conversation.key, { lastIntent: "product" });
    await respond(event.replyToken, conversation.key, [textMessage(answer)]);
    await recordMessage(conversation.key, "assistant", answer, "product");
    return;
  }

  const turnsUsed = state.smalltalkTurns + 1;
  if (turnsUsed >= SMALLTALK_TURN_LIMIT) {
    await updateConversation(conversation.key, {
      smalltalkTurns: 0,
      lastIntent: "smalltalk_closed",
      closedAt: new Date(),
    });
    await respond(event.replyToken, conversation.key, [textMessage(CLOSING_MESSAGE)]);
    await recordMessage(conversation.key, "assistant", CLOSING_MESSAGE, "smalltalk_closed");
    return;
  }

  const reply = await answerSmalltalk(text, history, turnsUsed);
  await updateConversation(conversation.key, {
    smalltalkTurns: turnsUsed,
    lastIntent: "smalltalk",
  });
  await respond(event.replyToken, conversation.key, [textMessage(reply)]);
  await recordMessage(conversation.key, "assistant", reply, "smalltalk");
}

async function handleFollow(
  event: webhook.FollowEvent & { replyToken: string },
): Promise<void> {
  const conversation = getConversation(event);
  await respond(event.replyToken, conversation?.key ?? "", [
    textMessage(WELCOME_MESSAGE),
    orderButtonMessage(),
  ]);
}

function hasReplyToken<T extends webhook.Event>(
  event: T,
): event is T & { replyToken: string } {
  return "replyToken" in event && typeof event.replyToken === "string";
}

export async function handleWebhookEvents(events: webhook.Event[]): Promise<void> {
  for (const event of events) {
    const claimed = await claimWebhookEvent(event.webhookEventId);
    if (!claimed) {
      continue;
    }

    if (!hasReplyToken(event)) {
      continue;
    }

    try {
      if (event.type === "follow") {
        await handleFollow(event);
        continue;
      }
      if (event.type === "message" && event.message.type === "text") {
        const text = event.message.text.trim();
        if (text) {
          await handleTextMessage(event, text);
        }
      }
    } catch (error) {
      console.error("LINE event handling failed", {
        webhookEventId: event.webhookEventId,
        error,
      });
    }
  }
}

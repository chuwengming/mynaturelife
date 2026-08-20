import type { messagingApi, webhook } from "@line/bot-sdk";
import { parseAdminQuery } from "@/lib/admin/parse";
import { runAdminTool } from "@/lib/admin/query";
import { classifyIntent, type Intent } from "@/lib/ai/classify";
import { answerProductQuestion, answerSmalltalk } from "@/lib/ai/reply";
import { continueOrderFlow, startOrderFlow } from "@/lib/chat/amend";
import {
  loadConversation,
  recentHistory,
  recordMessage,
  updateConversation,
  type ConversationKind,
} from "@/lib/chat/conversation";
import { isLookupMyId, mentionsNewOrder } from "@/lib/chat/keywords";
import {
  CLOSING_MESSAGE,
  ORDER_INVITE_MESSAGE,
  SMALLTALK_TURN_LIMIT,
  isInCooldown,
} from "@/lib/chat/policy";
import { claimWebhookEvent } from "@/lib/line/idempotency";
import { isAdminLineUser } from "@/lib/line/env";
import { orderButtonMessage } from "@/lib/line/liff-link";
import { pushMessages, replyMessages } from "@/lib/line/messages";
import { pruneRetention } from "@/lib/db/retention";

const WELCOME_MESSAGE =
  "你好，我是「我的自然生活」的客服。我們做果酵豆腐乳（原味、辣味）。想訂購請傳「訂購」；要取消或更改訂單也可以直接跟我說。";

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

async function respond(
  replyToken: string,
  conversationKey: string,
  messages: messagingApi.Message[],
): Promise<void> {
  try {
    await replyMessages(replyToken, messages);
  } catch (error) {
    console.error("reply failed, falling back to push", error);
    await pushMessages(conversationKey, messages);
  }
}

function formatUserIdReply(userId: string | null): string {
  if (!userId) {
    return "目前拿不到你的 userId。請先把「我的自然生活」加為好友後，在一對一聊天再傳一次：我的ID";
  }
  return `你的 LINE userId：\n${userId}`;
}

async function replyTextAndLog(
  replyToken: string,
  conversation: Conversation,
  text: string,
  intent: string,
): Promise<void> {
  await respond(replyToken, conversation.key, [textMessage(text)]);
  await recordMessage(conversation.key, "assistant", text, intent);
}

async function handleOrderIntent(
  replyToken: string,
  conversation: Conversation,
): Promise<void> {
  await updateConversation(conversation.key, {
    smalltalkTurns: 0,
    lastIntent: "order",
    closedAt: null,
    flowJson: null,
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
  const speakerId = event.source?.userId ?? null;

  if (isLookupMyId(text)) {
    if (conversation.kind !== "user") {
      await respond(event.replyToken, conversation.key, [
        textMessage("查詢 userId 請先把「我的自然生活」加為好友，再在一對一聊天傳：我的ID"),
      ]);
      return;
    }
    await respond(event.replyToken, conversation.key, [
      textMessage(formatUserIdReply(speakerId)),
    ]);
    return;
  }

  const state = await loadConversation(conversation.key, conversation.kind);

  const adminAllowed =
    conversation.kind === "user" && isAdminLineUser(speakerId);
  if (adminAllowed) {
    const parsed = await parseAdminQuery(text);
    if (parsed.action !== "not_admin") {
      const report = await runAdminTool(parsed);
      await recordMessage(conversation.key, "user", text, "admin");
      await replyTextAndLog(event.replyToken, conversation, report, "admin");
      return;
    }
  }

  if (state.flowJson && speakerId) {
    const continued = await continueOrderFlow(
      conversation.key,
      speakerId,
      text,
      state.flowJson,
    );
    if (continued.action === "ignore") {
      return;
    }
    if (continued.action === "reply") {
      await recordMessage(conversation.key, "user", text, "flow");
      await replyTextAndLog(event.replyToken, conversation, continued.text, "flow");
      return;
    }
  }

  if (isInCooldown(state.closedAt)) {
    if (mentionsNewOrder(text)) {
      await recordMessage(conversation.key, "user", text, "order");
      await handleOrderIntent(event.replyToken, conversation);
      return;
    }
    const history = await recentHistory(conversation.key);
    const coolIntent = await classifyIntent(text, history);
    if ((coolIntent === "cancel" || coolIntent === "amend") && speakerId) {
      await recordMessage(conversation.key, "user", text, coolIntent);
      const answer = await startOrderFlow(conversation.key, speakerId, coolIntent);
      await replyTextAndLog(event.replyToken, conversation, answer, coolIntent);
    }
    return;
  }

  const history = await recentHistory(conversation.key);
  const intent: Intent = await classifyIntent(text, history);
  await recordMessage(conversation.key, "user", text, intent);

  if ((intent === "cancel" || intent === "amend") && speakerId) {
    const answer = await startOrderFlow(conversation.key, speakerId, intent);
    await replyTextAndLog(event.replyToken, conversation, answer, intent);
    return;
  }
  if ((intent === "cancel" || intent === "amend") && !speakerId) {
    await replyTextAndLog(
      event.replyToken,
      conversation,
      "目前認不出是哪一位客人。請在一對一聊天跟我說取消或更改訂購。",
      intent,
    );
    return;
  }

  if (intent === "order") {
    await handleOrderIntent(event.replyToken, conversation);
    return;
  }

  if (intent === "product") {
    const answer = await answerProductQuestion(text, history);
    await updateConversation(conversation.key, { lastIntent: "product" });
    await replyTextAndLog(event.replyToken, conversation, answer, "product");
    return;
  }

  const turnsUsed = state.smalltalkTurns + 1;
  if (turnsUsed >= SMALLTALK_TURN_LIMIT) {
    await updateConversation(conversation.key, {
      smalltalkTurns: 0,
      lastIntent: "smalltalk_closed",
      closedAt: new Date(),
    });
    await replyTextAndLog(
      event.replyToken,
      conversation,
      CLOSING_MESSAGE,
      "smalltalk_closed",
    );
    return;
  }

  const reply = await answerSmalltalk(text, history, turnsUsed);
  await updateConversation(conversation.key, {
    smalltalkTurns: turnsUsed,
    lastIntent: "smalltalk",
  });
  await replyTextAndLog(event.replyToken, conversation, reply, "smalltalk");
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
    try {
      const claimed = await claimWebhookEvent(event.webhookEventId);
      if (!claimed) {
        continue;
      }

      if (!hasReplyToken(event)) {
        continue;
      }

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

  try {
    await pruneRetention();
  } catch (error) {
    console.error("retention prune failed", error);
  }
}

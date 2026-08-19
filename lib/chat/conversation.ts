import type { AiMessage } from "@/lib/ai/client";
import { getPrisma } from "@/lib/db/prisma";

export type ConversationKind = "user" | "group" | "room";

export type ConversationState = {
  key: string;
  smalltalkTurns: number;
  closedAt: Date | null;
  flowJson: string | null;
};

const HISTORY_LIMIT = 8;

/** 沒有資料庫時（本機過渡）回一個空狀態，聊天仍可運作但不累計輪數。 */
export async function loadConversation(
  key: string,
  kind: ConversationKind,
): Promise<ConversationState> {
  const prisma = getPrisma();
  if (!prisma) {
    return { key, smalltalkTurns: 0, closedAt: null, flowJson: null };
  }
  try {
    const row = await prisma.conversation.upsert({
      where: { key },
      update: {},
      create: { key, kind },
    });
    return { key, smalltalkTurns: row.smalltalkTurns, closedAt: row.closedAt, flowJson: row.flowJson };
  } catch (error) {
    console.error("load conversation failed", error);
    return { key, smalltalkTurns: 0, closedAt: null, flowJson: null };
  }
}

export async function recentHistory(key: string): Promise<AiMessage[]> {
  const prisma = getPrisma();
  if (!prisma) {
    return [];
  }
  try {
    const rows = await prisma.chatMessage.findMany({
      where: { conversationKey: key },
      orderBy: { createdAt: "desc" },
      take: HISTORY_LIMIT,
    });
    return rows
      .reverse()
      .map((row) => ({
        role: row.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: row.content,
      }));
  } catch (error) {
    console.error("load history failed", error);
    return [];
  }
}

export async function recordMessage(
  key: string,
  role: "user" | "assistant",
  content: string,
  intent?: string,
): Promise<void> {
  const prisma = getPrisma();
  if (!prisma) {
    return;
  }
  try {
    await prisma.chatMessage.create({
      data: { conversationKey: key, role, content, intent: intent ?? null },
    });
  } catch (error) {
    console.error("record message failed", error);
  }
}

export async function updateConversation(
  key: string,
    data: { smalltalkTurns?: number; lastIntent?: string; closedAt?: Date | null; flowJson?: string | null },
): Promise<void> {
  const prisma = getPrisma();
  if (!prisma) {
    return;
  }
  try {
    await prisma.conversation.update({ where: { key }, data });
  } catch (error) {
    console.error("update conversation failed", error);
  }
}

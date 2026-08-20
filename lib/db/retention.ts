import { getPrisma } from "@/lib/db/prisma";

const EVENT_TTL_DAYS = 7;
const MESSAGE_TTL_DAYS = 30;

/** 去重列保留 7 天；聊天紀錄保留 30 天。不改變 webhook_event_id 唯一語意。 */
export async function pruneRetention(): Promise<void> {
  const prisma = getPrisma();
  if (!prisma) {
    return;
  }
  const eventCutoff = new Date(Date.now() - EVENT_TTL_DAYS * 24 * 60 * 60 * 1000);
  const messageCutoff = new Date(Date.now() - MESSAGE_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.processedEvent.deleteMany({ where: { createdAt: { lt: eventCutoff } } });
  await prisma.chatMessage.deleteMany({ where: { createdAt: { lt: messageCutoff } } });
}

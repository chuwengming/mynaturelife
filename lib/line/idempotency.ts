import { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/db/prisma";

export async function claimWebhookEvent(webhookEventId: string): Promise<boolean> {
  const prisma = getPrisma();
  if (!prisma) {
    console.warn("DATABASE_URL missing; skip webhook idempotency");
    return true;
  }

  try {
    await prisma.processedEvent.create({ data: { id: webhookEventId } });
    return true;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return false;
    }
    throw error;
  }
}

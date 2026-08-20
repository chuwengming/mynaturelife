import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  let databaseOk = false;
  const prisma = getPrisma();
  if (prisma) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      databaseOk = true;
    } catch (error) {
      console.error("health database ping failed", error);
    }
  }

  return NextResponse.json({
    ok: true,
    service: "nature-life-bot",
    hasChannelSecret: Boolean(process.env.LINE_CHANNEL_SECRET),
    hasChannelAccessToken: Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN),
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    databaseOk,
    hasLiffId: Boolean(process.env.NEXT_PUBLIC_LINE_LIFF_ID ?? process.env.LINE_LIFF_ID),
    hasLoginChannelId: Boolean(process.env.LINE_LOGIN_CHANNEL_ID),
    hasAdminIds: Boolean(process.env.ADMIN_LINE_USER_IDS),
    hasAiKey: Boolean(process.env.DEEPSEEK_API_KEY ?? process.env.AI_API_KEY),
    aiChatModel: process.env.AI_CHAT_MODEL ?? "deepseek-v4-flash",
    aiWebSearch: (process.env.AI_WEB_SEARCH ?? "on").toLowerCase() !== "off",
  });
}

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "nature-life-bot",
    hasChannelSecret: Boolean(process.env.LINE_CHANNEL_SECRET),
    hasChannelAccessToken: Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN),
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    hasLiffId: Boolean(process.env.NEXT_PUBLIC_LINE_LIFF_ID ?? process.env.LINE_LIFF_ID),
    hasLoginChannelId: Boolean(process.env.LINE_LOGIN_CHANNEL_ID),
    hasAdminIds: Boolean(process.env.ADMIN_LINE_USER_IDS),
  });
}

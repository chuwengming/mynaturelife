import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "nature-life-bot",
    hasChannelSecret: Boolean(process.env.LINE_CHANNEL_SECRET),
    hasChannelAccessToken: Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN),
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
  });
}

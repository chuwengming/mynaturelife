import { validateSignature, type webhook } from "@line/bot-sdk";
import { NextRequest, NextResponse } from "next/server";
import { handleWebhookEvents } from "@/lib/line/handle-events";
import { getLineChannelSecret } from "@/lib/line/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-line-signature") ?? "";

  let channelSecret: string;
  try {
    channelSecret = getLineChannelSecret();
  } catch {
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  if (!validateSignature(rawBody, channelSecret, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let payload: webhook.CallbackRequest;
  try {
    payload = JSON.parse(rawBody) as webhook.CallbackRequest;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  try {
    await handleWebhookEvents(payload.events ?? []);
  } catch (error) {
    console.error("webhook handler error", error);
  }

  return NextResponse.json({ ok: true });
}

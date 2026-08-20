import type { messagingApi } from "@line/bot-sdk";
import { getLineClient } from "@/lib/line/client";

export async function replyMessages(
  replyToken: string,
  messages: messagingApi.Message[],
): Promise<void> {
  await getLineClient().replyMessage({ replyToken, messages });
}

export async function pushMessages(
  to: string,
  messages: messagingApi.Message[],
): Promise<void> {
  await getLineClient().pushMessage({ to, messages });
}

export async function pushText(to: string, text: string): Promise<void> {
  await pushMessages(to, [{ type: "text", text }]);
}

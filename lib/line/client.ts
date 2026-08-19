import { messagingApi } from "@line/bot-sdk";
import { getLineChannelAccessToken } from "@/lib/line/env";

let client: messagingApi.MessagingApiClient | null = null;

export function getLineClient(): messagingApi.MessagingApiClient {
  if (!client) {
    client = new messagingApi.MessagingApiClient({
      channelAccessToken: getLineChannelAccessToken(),
    });
  }
  return client;
}

export async function replyText(replyToken: string, text: string): Promise<void> {
  await getLineClient().replyMessage({
    replyToken,
    messages: [{ type: "text", text }],
  });
}

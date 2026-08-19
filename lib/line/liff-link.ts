import type { messagingApi } from "@line/bot-sdk";
import { getLiffId } from "@/lib/line/env";

export function liffOrderUrl(): string {
  return `https://liff.line.me/${getLiffId()}`;
}

export function orderButtonMessage(): messagingApi.TemplateMessage {
  return {
    type: "template",
    altText: "請填寫訂購資料，送出即成立。",
    template: {
      type: "buttons",
      title: "我的自然生活",
      text: "訂購請填表單，送出即成立。",
      actions: [
        {
          type: "uri",
          label: "開始訂購",
          uri: liffOrderUrl(),
        },
      ],
    },
  };
}

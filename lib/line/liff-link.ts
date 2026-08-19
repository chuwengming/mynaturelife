import type { messagingApi } from "@line/bot-sdk";
import { getLiffId } from "@/lib/line/env";

export function liffBookingUrl(): string {
  return `https://liff.line.me/${getLiffId()}`;
}

export function bookingButtonMessage(): messagingApi.TemplateMessage {
  return {
    type: "template",
    altText: "請填寫預約資料，送出即成立。",
    template: {
      type: "buttons",
      title: "我的自然生活",
      text: "預約請填表單，送出即成立。",
      actions: [
        {
          type: "uri",
          label: "開始預約",
          uri: liffBookingUrl(),
        },
      ],
    },
  };
}

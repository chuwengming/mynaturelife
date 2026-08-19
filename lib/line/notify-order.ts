import { getAdminLineUserIds } from "@/lib/line/env";
import { pushText } from "@/lib/line/messages";
import { DELIVERY_MIN_QTY, labelForItem } from "@/lib/order/options";

export type OrderNotice = {
  lineUserId: string;
  name: string;
  phone: string;
  orderDate: string;
  orderItem: string;
  plainQty: number;
  spicyQty: number;
  address: string | null;
  notes: string | null;
  sourceType: string;
  sourceId: string;
};

function formatOrder(notice: OrderNotice, heading: string): string {
  const total = notice.plainQty + notice.spicyQty;
  const lines = [
    heading,
    `姓名：${notice.name}`,
    `電話：${notice.phone}`,
    `訂購日期：${notice.orderDate}`,
    `訂購項目：${labelForItem(notice.orderItem)}`,
    `原味數量：${notice.plainQty}`,
    `辣味數量：${notice.spicyQty}`,
    `合計：${total} 罐`,
  ];
  if (notice.address) {
    lines.push(`地址：${notice.address}`);
  }
  if (notice.notes) {
    lines.push(`備註：${notice.notes}`);
  }
  if (total >= DELIVERY_MIN_QTY) {
    lines.push("配送：可宅配（運費另計）");
  }
  lines.push("狀態：已成立");
  return lines.join("\n");
}

export async function notifyOrderConfirmed(notice: OrderNotice): Promise<void> {
  const conversationId =
    notice.sourceType === "group" || notice.sourceType === "room"
      ? notice.sourceId
      : notice.lineUserId;

  const userText = formatOrder(notice, "訂單已成立，我們會盡快與你聯繫。");
  const adminText = formatOrder(notice, "有一筆新訂單已成立。");

  const jobs: Array<{ to: string; text: string }> = [
    { to: conversationId, text: userText },
  ];

  for (const adminId of getAdminLineUserIds()) {
    if (adminId === conversationId) {
      continue;
    }
    jobs.push({ to: adminId, text: adminText });
  }

  for (const job of jobs) {
    try {
      await pushText(job.to, job.text);
    } catch (error) {
      console.error("LINE push failed", { toKind: job.to.slice(0, 1), error });
    }
  }
}

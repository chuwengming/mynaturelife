import type { Order } from "@prisma/client";
import { labelForItem } from "@/lib/order/options";

export function orderYmd(order: Order): string {
  return order.orderDate.toISOString().slice(0, 10);
}

export function formatOrderCard(order: Order, index?: number): string {
  const prefix = typeof index === "number" ? `【${index}】` : "";
  const lines = [
    `${prefix}訂單 ${order.id.slice(-6)}（${order.status === "cancelled" ? "已取消" : "已成立"}）`,
    `姓名：${order.name}`,
    `電話：${order.phone}`,
    `訂購日期：${orderYmd(order)}`,
    `項目：${labelForItem(order.orderItem)}`,
    `原味：${order.plainQty} 罐、辣味：${order.spicyQty} 罐、合計 ${order.plainQty + order.spicyQty} 罐`,
  ];
  if (order.address) {
    lines.push(`地址：${order.address}`);
  }
  if (order.notes) {
    lines.push(`備註：${order.notes}`);
  }
  return lines.join("\n");
}

export function clipLineText(text: string, max = 4500): string {
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max)}\n…（內容過長，已截斷）`;
}

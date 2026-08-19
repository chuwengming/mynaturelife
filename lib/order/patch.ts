import type { Order } from "@prisma/client";
import { chatComplete } from "@/lib/ai/client";
import { getClassifyModel, isAiEnabled } from "@/lib/ai/env";
import { isYmd, minOrderDateYmd } from "@/lib/order/dates";
import { orderYmd } from "@/lib/order/format";
import { isOrderItem, labelForItem, MAX_QTY_PER_FLAVOR, type OrderItemValue } from "@/lib/order/options";
import { parseQty, validateOrder, type NormalizedOrder } from "@/lib/order/validate";

export type OrderPatch = {
  name?: string;
  phone?: string;
  orderDate?: string;
  orderItem?: OrderItemValue;
  plainQty?: number;
  spicyQty?: number;
  address?: string | null;
  notes?: string | null;
};

const SYSTEM = `你把客人「要改訂單」的中文轉成 json。只輸出有要改的欄位，沒改的不要出現。
可用欄位：name, phone, orderDate(YYYY-MM-DD), orderItem(tofu_curd_plain 或 tofu_curd_spicy), plainQty(整數), spicyQty(整數), address(字串或 null 表示清空), notes。
無法理解時輸出 {"error":"不清楚"}。提示詞必須含 json。`;

function asPatch(raw: Record<string, unknown>): OrderPatch | null {
  const patch: OrderPatch = {};
  if (typeof raw.name === "string" && raw.name.trim()) {
    patch.name = raw.name.trim();
  }
  if (typeof raw.phone === "string" && raw.phone.trim()) {
    patch.phone = raw.phone.trim().replace(/\s+/g, "");
  }
  if (typeof raw.orderDate === "string" && isYmd(raw.orderDate)) {
    patch.orderDate = raw.orderDate;
  }
  if (typeof raw.orderItem === "string" && isOrderItem(raw.orderItem)) {
    patch.orderItem = raw.orderItem;
  }
  if (raw.plainQty !== undefined) {
    const qty = parseQty(raw.plainQty);
    if (qty === null) {
      return null;
    }
    patch.plainQty = qty;
  }
  if (raw.spicyQty !== undefined) {
    const qty = parseQty(raw.spicyQty);
    if (qty === null) {
      return null;
    }
    patch.spicyQty = qty;
  }
  if (raw.address === null) {
    patch.address = null;
  } else if (typeof raw.address === "string") {
    patch.address = raw.address.trim() || null;
  }
  if (raw.notes === null) {
    patch.notes = null;
  } else if (typeof raw.notes === "string") {
    patch.notes = raw.notes.trim() || null;
  }
  return Object.keys(patch).length > 0 ? patch : null;
}

function heuristicPatch(text: string): OrderPatch | null {
  const patch: OrderPatch = {};
  const plain = text.match(/原味\s*(\d+)/);
  const spicy = text.match(/辣味\s*(\d+)/);
  if (plain) {
    const qty = Number(plain[1]);
    if (qty <= MAX_QTY_PER_FLAVOR) {
      patch.plainQty = qty;
    }
  }
  if (spicy) {
    const qty = Number(spicy[1]);
    if (qty <= MAX_QTY_PER_FLAVOR) {
      patch.spicyQty = qty;
    }
  }
  const date = text.match(/(\d{4}-\d{2}-\d{2})/);
  if (date) {
    patch.orderDate = date[1];
  }
  const phone = text.match(/(電話|手機)\s*([\d+\-()]{8,20})/);
  if (phone) {
    patch.phone = phone[2];
  }
  const address = text.match(/地址[：:]\s*(.+)$/m);
  if (address) {
    patch.address = address[1].trim();
  }
  return Object.keys(patch).length > 0 ? patch : null;
}

export async function parseOrderPatch(text: string): Promise<OrderPatch | null> {
  const fallback = heuristicPatch(text);
  if (!isAiEnabled()) {
    return fallback;
  }
  try {
    const raw = await chatComplete({
      model: getClassifyModel(),
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: text },
      ],
      temperature: 0,
      maxTokens: 200,
      json: true,
      timeoutMs: 8_000,
    });
    const data = JSON.parse(raw) as Record<string, unknown>;
    if (data.error) {
      return fallback;
    }
    return asPatch(data) ?? fallback;
  } catch {
    return fallback;
  }
}

export function applyPatch(
  order: Order,
  patch: OrderPatch,
): { ok: true; next: NormalizedOrder } | { ok: false; reasons: string[] } {
  const merged = {
    name: patch.name ?? order.name,
    phone: patch.phone ?? order.phone,
    orderDate: patch.orderDate ?? orderYmd(order),
    orderItem: patch.orderItem ?? order.orderItem,
    plainQty: patch.plainQty ?? order.plainQty,
    spicyQty: patch.spicyQty ?? order.spicyQty,
    address: patch.address !== undefined ? patch.address : order.address,
    notes: patch.notes !== undefined ? patch.notes : order.notes,
  };
  const result = validateOrder(merged);
  if (result.ok) {
    return { ok: true, next: result.order };
  }
  // 未改日期時，允許既有訂單日期早於今天（只擋「新改的日期」早於今天）。
  if (patch.orderDate === undefined) {
    const filtered = result.reasons.filter((reason) => !reason.includes("訂購日期"));
    if (filtered.length === 0) {
      const retry = validateOrder({ ...merged, orderDate: minOrderDateYmd() });
      if (retry.ok) {
        return { ok: true, next: { ...retry.order, orderDate: merged.orderDate } };
      }
    }
    return { ok: false, reasons: filtered.length ? filtered : result.reasons };
  }
  return result;
}

export function describePatch(patch: OrderPatch): string {
  const lines: string[] = [];
  if (patch.name) {
    lines.push(`姓名 → ${patch.name}`);
  }
  if (patch.phone) {
    lines.push(`電話 → ${patch.phone}`);
  }
  if (patch.orderDate) {
    lines.push(`訂購日期 → ${patch.orderDate}`);
  }
  if (patch.orderItem) {
    lines.push(`項目 → ${labelForItem(patch.orderItem)}`);
  }
  if (patch.plainQty !== undefined) {
    lines.push(`原味數量 → ${patch.plainQty}`);
  }
  if (patch.spicyQty !== undefined) {
    lines.push(`辣味數量 → ${patch.spicyQty}`);
  }
  if (patch.address !== undefined) {
    lines.push(`地址 → ${patch.address ?? "（清空）"}`);
  }
  if (patch.notes !== undefined) {
    lines.push(`備註 → ${patch.notes ?? "（清空）"}`);
  }
  return lines.join("\n");
}

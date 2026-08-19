import {
  DELIVERY_MIN_QTY,
  MAX_QTY_PER_FLAVOR,
  isOrderItem,
  type OrderItemValue,
} from "@/lib/order/options";
import { isYmd, minOrderDateYmd } from "@/lib/order/dates";

export type OrderInput = {
  name?: unknown;
  phone?: unknown;
  orderDate?: unknown;
  orderItem?: unknown;
  plainQty?: unknown;
  spicyQty?: unknown;
  address?: unknown;
  notes?: unknown;
};

export type NormalizedOrder = {
  name: string;
  phone: string;
  orderDate: string;
  orderItem: OrderItemValue;
  plainQty: number;
  spicyQty: number;
  totalQty: number;
  address: string | null;
  notes: string | null;
};

export type OrderValidation =
  | { ok: true; order: NormalizedOrder }
  | { ok: false; reasons: string[] };

function asTrimmedString(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return "";
}

/** 空白視為 0；非整數或超出上限回傳 null。 */
export function parseQty(value: unknown): number | null {
  const raw = asTrimmedString(value);
  if (!raw) {
    return 0;
  }
  if (!/^\d+$/.test(raw)) {
    return null;
  }
  const qty = Number(raw);
  return qty > MAX_QTY_PER_FLAVOR ? null : qty;
}

export function validateOrder(input: OrderInput): OrderValidation {
  const reasons: string[] = [];

  const name = asTrimmedString(input.name);
  const phone = asTrimmedString(input.phone).replace(/\s+/g, "");
  const orderDate = asTrimmedString(input.orderDate);
  const orderItem = asTrimmedString(input.orderItem);
  const address = asTrimmedString(input.address);
  const notes = asTrimmedString(input.notes);
  const plainQty = parseQty(input.plainQty);
  const spicyQty = parseQty(input.spicyQty);

  if (!name) {
    reasons.push("請填寫姓名。");
  }
  if (!phone) {
    reasons.push("請填寫電話。");
  } else if (!/^[\d+\-()]{8,20}$/.test(phone)) {
    reasons.push("電話格式不正確，請填 8～20 位數字。");
  }
  if (!isOrderItem(orderItem)) {
    reasons.push("請選擇訂購項目。");
  }
  if (plainQty === null || spicyQty === null) {
    reasons.push(`數量請填 0～${MAX_QTY_PER_FLAVOR} 的整數。`);
  } else if (plainQty + spicyQty < 1) {
    reasons.push("原味數量與辣味數量至少要有一欄填入大於 0 的數字。");
  }
  if (!isYmd(orderDate)) {
    reasons.push("請選擇訂購日期。");
  } else if (orderDate < minOrderDateYmd()) {
    reasons.push("訂購日期不可早於今天。");
  }

  const totalQty = (plainQty ?? 0) + (spicyQty ?? 0);
  if (totalQty >= DELIVERY_MIN_QTY && !address) {
    reasons.push(`訂購 ${DELIVERY_MIN_QTY} 罐(含)以上可宅配，請填寫地址。`);
  }

  if (reasons.length > 0) {
    return { ok: false, reasons };
  }

  return {
    ok: true,
    order: {
      name,
      phone,
      orderDate,
      orderItem: orderItem as OrderItemValue,
      plainQty: plainQty ?? 0,
      spicyQty: spicyQty ?? 0,
      totalQty,
      address: address || null,
      notes: notes || null,
    },
  };
}

export function formatReasons(reasons: string[]): string {
  return ["訂單未成立，原因如下：", ...reasons.map((reason) => `・${reason}`)].join("\n");
}

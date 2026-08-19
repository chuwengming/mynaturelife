export const ORDER_ITEMS = [
  { value: "tofu_curd_plain", label: "豆腐乳(原味)" },
  { value: "tofu_curd_spicy", label: "豆腐乳(辣味)" },
] as const;

export type OrderItemValue = (typeof ORDER_ITEMS)[number]["value"];

/** 6 罐以上可宅配，此時地址為必填。 */
export const DELIVERY_MIN_QTY = 6;

export const MAX_QTY_PER_FLAVOR = 999;

export function isOrderItem(value: string): value is OrderItemValue {
  return ORDER_ITEMS.some((item) => item.value === value);
}

export function labelForItem(value: string): string {
  return ORDER_ITEMS.find((item) => item.value === value)?.label ?? value;
}

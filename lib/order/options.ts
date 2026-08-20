export const ORDER_ITEMS = [
  { value: "tofu_curd_plain", label: "豆腐乳(原味)" },
  { value: "tofu_curd_spicy", label: "豆腐乳(辣味)" },
] as const;

export type OrderItemValue = (typeof ORDER_ITEMS)[number]["value"];

/** 6 罐以上可以宅配（運費另計）。地址一律選填，缺地址不得拒絕訂單。 */
export const DELIVERY_MIN_QTY = 6;

export const MAX_QTY_PER_FLAVOR = 999;

/** 與 docs/faq.md 單價同步，供銷售金額試算。 */
export const PRICE_PER_JAR = 280;

export function isOrderItem(value: string): value is OrderItemValue {
  return ORDER_ITEMS.some((item) => item.value === value);
}

export function labelForItem(value: string): string {
  return ORDER_ITEMS.find((item) => item.value === value)?.label ?? value;
}

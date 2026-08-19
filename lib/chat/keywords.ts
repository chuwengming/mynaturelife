/** 「預約」保留為舊訊息與舊按鈕的相容關鍵字。 */
const ORDER_KEYWORDS = ["訂購", "訂單", "下單", "預約", "我要買", "購買", "要買"];

const PRODUCT_KEYWORDS = [
  "豆腐乳",
  "成分",
  "價格",
  "多少錢",
  "運費",
  "宅配",
  "配送",
  "保存",
  "期限",
  "口味",
  "辣",
  "原味",
  "幾罐",
  "罐",
];

export function isLookupMyId(text: string): boolean {
  const normalized = text.replace(/\s+/g, "").toLowerCase();
  return normalized === "我的id" || normalized === "/id";
}

export function mentionsCancel(text: string): boolean {
  return /取消\s*(訂購|訂單|預約)|不要這筆訂單|訂單取消/.test(text);
}

export function mentionsAmend(text: string): boolean {
  return /(更改|修改|更正|改一?下)\s*(訂購|訂單|訂購資訊|訂單資料)|改(數量|地址|電話|日期|口味)/.test(
    text,
  );
}

/** 開新表單；取消／更改不得算成新訂購。 */
export function mentionsNewOrder(text: string): boolean {
  if (mentionsCancel(text) || mentionsAmend(text)) {
    return false;
  }
  return ORDER_KEYWORDS.some((keyword) => text.includes(keyword));
}

/** 冷靜期內開表單用。 */
export function mentionsOrder(text: string): boolean {
  return mentionsNewOrder(text);
}

export function mentionsProduct(text: string): boolean {
  return PRODUCT_KEYWORDS.some((keyword) => text.includes(keyword));
}

export function mentionsAbortFlow(text: string): boolean {
  const t = text.replace(/\s+/g, "");
  return /^(算了|不用了|先不用|取消操作|放棄|不要改了|不要取消)$/.test(t);
}

export function mentionsConfirm(text: string): boolean {
  const t = text.replace(/\s+/g, "");
  return /^(是|好|好的|確定|確認|對|可以|要|要取消|取消這筆|OK|ok|Ok)$/.test(t);
}

export function parseListIndex(text: string, max: number): number | null {
  const match = text.replace(/\s+/g, "").match(/^(第?\s*)?([1-9]|10)(筆|號|號訂單)?$/);
  if (!match) {
    return null;
  }
  const index = Number(match[2]);
  if (index < 1 || index > max) {
    return null;
  }
  return index - 1;
}

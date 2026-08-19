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

/** 冷靜期內只有這類「明確提到訂購」的訊息才回應。 */
export function mentionsOrder(text: string): boolean {
  return ORDER_KEYWORDS.some((keyword) => text.includes(keyword));
}

export function mentionsProduct(text: string): boolean {
  return PRODUCT_KEYWORDS.some((keyword) => text.includes(keyword));
}

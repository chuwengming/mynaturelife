/** 「預約」保留為舊訊息與舊按鈕的相容關鍵字。 */
const DEFINITE_NEW_ORDER = ["訂購", "下單", "預約", "我要買", "購買", "要買"];

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

/** 「我的訂單到了沒」這類查詢，不得當成新訂購。 */
export function mentionsOrderQuery(text: string): boolean {
  return /我的訂單|查(詢|一下)?\s*訂單|訂單(到了沒?|狀態|進度|呢|怎麼了)|有沒有訂單|訂單在哪/.test(
    text,
  );
}

/**
 * 開新表單。契約保留「訂單」為開表單詞，但僅在明確要開單時生效
 * （整句就是「訂單」，或「我要訂單／填訂單」）；查詢／取消／更改優先。
 */
export function mentionsNewOrder(text: string): boolean {
  if (mentionsCancel(text) || mentionsAmend(text) || mentionsOrderQuery(text)) {
    return false;
  }
  if (DEFINITE_NEW_ORDER.some((keyword) => text.includes(keyword))) {
    return true;
  }
  const compact = text.replace(/\s+/g, "");
  return (
    compact === "訂單" ||
    /^(我要)?(開始|填|開)?訂單(表單)?$/.test(compact) ||
    /請給我訂單|訂單表單/.test(text)
  );
}

/** 冷靜期內開表單用。 */
export function mentionsOrder(text: string): boolean {
  return mentionsNewOrder(text);
}

export function mentionsProduct(text: string): boolean {
  return PRODUCT_KEYWORDS.some((keyword) => text.includes(keyword));
}

/** FAQ 規格題：不要上網搜。 */
export function isShopSpecQuestion(text: string): boolean {
  return /價格|多少錢|單價|280|成分|保存|期限|重量|容量|600|1100|產地|石岡|全素|素食|化學添加|醬汁|夾取|開封|冷藏|陰涼/.test(
    text,
  );
}

/** 與本店規格無關的一般知識，才允許網路搜尋。 */
export function isGeneralKnowledgeQuestion(text: string): boolean {
  return /吃法|怎麼吃|入菜|料理|清炒|配粥|伴手禮|當小菜|可以跟.+一起/.test(text);
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

export function looksLikeAdminReport(text: string): boolean {
  return /總量|銷售|統計|報表|排名|採購量|列出.{0,6}訂單|訂單列表|哪一(位|個)客人|賣(了|出)?(幾罐|多少)/.test(
    text,
  );
}

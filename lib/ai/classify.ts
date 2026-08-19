import { chatComplete, type AiMessage } from "@/lib/ai/client";
import { getClassifyModel, isAiEnabled } from "@/lib/ai/env";
import {
  mentionsAmend,
  mentionsCancel,
  mentionsNewOrder,
  mentionsProduct,
} from "@/lib/chat/keywords";

export type Intent = "order" | "product" | "smalltalk" | "cancel" | "amend";

const SYSTEM = `你是台灣手工豆腐乳賣家「我的自然生活」的訊息分類器。
把客人這句話分成五類之一：
cancel：要取消已成立的訂單。
amend：要更改已成立訂單的數量、地址、日期、電話等。
order：想要新訂購、下單、買、詢問怎麼買。不是取消也不是更改。
product：在問產品或交易資訊（成分、口味、價格、運費、宅配、保存方式、出貨時間）。
smalltalk：寒暄、閒聊、天氣、心情、與產品和訂購無關的話題。
只輸出 json 物件：{"intent":"cancel|amend|order|product|smalltalk"}。不要任何說明文字。`;

function heuristicIntent(text: string): Intent {
  if (mentionsCancel(text)) {
    return "cancel";
  }
  if (mentionsAmend(text)) {
    return "amend";
  }
  if (mentionsNewOrder(text)) {
    return "order";
  }
  if (mentionsProduct(text)) {
    return "product";
  }
  return "smalltalk";
}

function parseIntent(raw: string): Intent | null {
  try {
    const value = (JSON.parse(raw) as { intent?: unknown }).intent;
    if (
      value === "order" ||
      value === "product" ||
      value === "smalltalk" ||
      value === "cancel" ||
      value === "amend"
    ) {
      return value;
    }
  } catch {
    // 交給關鍵字兜底
  }
  return null;
}

export async function classifyIntent(
  text: string,
  history: AiMessage[] = [],
): Promise<Intent> {
  if (mentionsCancel(text)) {
    return "cancel";
  }
  if (mentionsAmend(text)) {
    return "amend";
  }
  if (mentionsNewOrder(text)) {
    return "order";
  }
  if (!isAiEnabled()) {
    return heuristicIntent(text);
  }

  try {
    const raw = await chatComplete({
      model: getClassifyModel(),
      messages: [
        { role: "system", content: SYSTEM },
        ...history.slice(-4),
        { role: "user", content: text },
      ],
      temperature: 0,
      maxTokens: 40,
      json: true,
      timeoutMs: 8_000,
    });
    return parseIntent(raw) ?? heuristicIntent(text);
  } catch (error) {
    console.error("intent classify failed", error);
    return heuristicIntent(text);
  }
}

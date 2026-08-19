import { chatComplete, type AiMessage } from "@/lib/ai/client";
import { getClassifyModel, isAiEnabled } from "@/lib/ai/env";
import { mentionsOrder, mentionsProduct } from "@/lib/chat/keywords";

export type Intent = "order" | "product" | "smalltalk";

const SYSTEM = `你是台灣手工豆腐乳賣家「我的自然生活」的訊息分類器。
把客人這句話分成三類之一：
order：想要訂購、下單、買、詢問怎麼買、要幾罐、要改訂單。
product：在問產品或交易資訊（成分、口味、價格、運費、宅配、保存方式、出貨時間）。
smalltalk：寒暄、閒聊、天氣、心情、與產品和訂購無關的話題。
只輸出 JSON：{"intent":"order|product|smalltalk"}。不要任何說明文字。`;

function heuristicIntent(text: string): Intent {
  if (mentionsOrder(text)) {
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
    if (value === "order" || value === "product" || value === "smalltalk") {
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
  // 明確講「訂購」時不必花錢問模型。
  if (mentionsOrder(text)) {
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

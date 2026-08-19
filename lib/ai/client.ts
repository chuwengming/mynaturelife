import { getAiApiKey, getAiBaseUrl } from "@/lib/ai/env";

export type AiMessage = { role: "system" | "user" | "assistant"; content: string };

type CompleteOptions = {
  model: string;
  messages: AiMessage[];
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
  timeoutMs?: number;
};

export class AiError extends Error {}

async function once(options: CompleteOptions): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 15_000);

  try {
    const response = await fetch(`${getAiBaseUrl()}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getAiApiKey()}`,
      },
      body: JSON.stringify({
        model: options.model,
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 400,
        // DeepSeek V4 預設開啟思考模式，思考 token 會吃掉 max_tokens 導致 content 為空。
        // 客服短回覆與意圖分類都不需要思考。
        thinking: { type: "disabled" },
        stream: false,
        ...(options.json ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new AiError(`AI HTTP ${response.status} ${detail.slice(0, 200)}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new AiError("AI returned empty content");
    }
    return content;
  } finally {
    clearTimeout(timer);
  }
}

/** 逾時或 429／5xx 再試一次，仍失敗就丟出，由呼叫端改用固定文案。 */
export async function chatComplete(options: CompleteOptions): Promise<string> {
  if (!getAiApiKey()) {
    throw new AiError("AI api key missing");
  }
  try {
    return await once(options);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const retriable =
      message.includes("aborted") ||
      message.includes("AI HTTP 429") ||
      /AI HTTP 5\d\d/.test(message);
    if (!retriable) {
      throw error;
    }
    return once(options);
  }
}

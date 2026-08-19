import { AiError, type AiMessage } from "@/lib/ai/client";
import { getAiApiKey, getAiBaseUrl } from "@/lib/ai/env";

type ResponsesOutputItem = {
  type?: string;
  content?: Array<{ type?: string; text?: string }>;
};

export type WebSearchAnswer = { text: string; searched: boolean };

/**
 * DeepSeek 的 /responses 端點才有伺服器端 web_search（/chat/completions 沒有），
 * 用同一把 DEEPSEEK_API_KEY，不需要另外的搜尋服務金鑰。
 */
export async function answerWithWebSearch(options: {
  model: string;
  instructions: string;
  history: AiMessage[];
  text: string;
  maxOutputTokens?: number;
  timeoutMs?: number;
}): Promise<WebSearchAnswer> {
  if (!getAiApiKey()) {
    throw new AiError("AI api key missing");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 25_000);

  try {
    const response = await fetch(`${getAiBaseUrl()}/responses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getAiApiKey()}`,
      },
      body: JSON.stringify({
        model: options.model,
        instructions: options.instructions,
        input: [
          ...options.history
            .filter((message) => message.role !== "system")
            .map((message) => ({ role: message.role, content: message.content })),
          { role: "user", content: options.text },
        ],
        tools: [{ type: "web_search" }],
        tool_choice: "auto",
        temperature: 0.6,
        max_output_tokens: options.maxOutputTokens ?? 700,
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new AiError(`AI HTTP ${response.status} ${detail.slice(0, 200)}`);
    }

    const payload = (await response.json()) as {
      output_text?: string;
      output?: ResponsesOutputItem[];
    };

    const items = payload.output ?? [];
    const fromItems = items
      .filter((item) => item.type === "message")
      .flatMap((item) => item.content ?? [])
      .map((part) => part.text ?? "")
      .join(" ")
      .trim();
    const text = (payload.output_text?.trim() || fromItems).trim();

    if (!text) {
      throw new AiError("AI returned empty content");
    }

    return { text, searched: items.some((item) => item.type === "web_search_call") };
  } finally {
    clearTimeout(timer);
  }
}

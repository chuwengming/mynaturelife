const DEFAULT_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-v4-flash";

/** DeepSeek 走 OpenAI 相容協定，因此換供應商只要改 base URL、model 與 key。 */
export function getAiApiKey(): string {
  return process.env.DEEPSEEK_API_KEY ?? process.env.AI_API_KEY ?? "";
}

export function getAiBaseUrl(): string {
  return (process.env.AI_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
}

export function getChatModel(): string {
  return process.env.AI_CHAT_MODEL ?? DEFAULT_MODEL;
}

export function getClassifyModel(): string {
  return process.env.AI_CLASSIFY_MODEL ?? getChatModel();
}

export function isAiEnabled(): boolean {
  return Boolean(getAiApiKey());
}

/** 網路搜尋預設開啟；設 AI_WEB_SEARCH=off 可只用 docs/faq.md 回答。 */
export function isWebSearchEnabled(): boolean {
  return (process.env.AI_WEB_SEARCH ?? "on").toLowerCase() !== "off";
}

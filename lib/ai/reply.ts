import { chatComplete, type AiMessage } from "@/lib/ai/client";
import { getChatModel, isAiEnabled } from "@/lib/ai/env";
import { loadFaq } from "@/lib/ai/faq";
import { productSystemPrompt, smalltalkSystemPrompt } from "@/lib/ai/persona";
import { AI_UNAVAILABLE_MESSAGE, SMALLTALK_TURN_LIMIT } from "@/lib/chat/policy";

const MAX_REPLY_CHARS = 220;

function trimReply(text: string): string {
  const single = text.replace(/\s*\n\s*/g, " ").trim();
  return single.length > MAX_REPLY_CHARS ? `${single.slice(0, MAX_REPLY_CHARS)}…` : single;
}

async function generate(system: string, history: AiMessage[], text: string): Promise<string> {
  const raw = await chatComplete({
    model: getChatModel(),
    messages: [
      { role: "system", content: system },
      ...history.slice(-8),
      { role: "user", content: text },
    ],
    temperature: 0.6,
    maxTokens: 300,
    timeoutMs: 15_000,
  });
  return trimReply(raw);
}

export async function answerProductQuestion(
  text: string,
  history: AiMessage[],
): Promise<string> {
  if (!isAiEnabled()) {
    return AI_UNAVAILABLE_MESSAGE;
  }
  try {
    const faq = await loadFaq();
    return await generate(productSystemPrompt(faq), history, text);
  } catch (error) {
    console.error("product answer failed", error);
    return AI_UNAVAILABLE_MESSAGE;
  }
}

export async function answerSmalltalk(
  text: string,
  history: AiMessage[],
  turnsUsed: number,
): Promise<string> {
  if (!isAiEnabled()) {
    return AI_UNAVAILABLE_MESSAGE;
  }
  try {
    return await generate(
      smalltalkSystemPrompt(turnsUsed, SMALLTALK_TURN_LIMIT),
      history,
      text,
    );
  } catch (error) {
    console.error("smalltalk reply failed", error);
    return AI_UNAVAILABLE_MESSAGE;
  }
}

import { readFile } from "node:fs/promises";
import path from "node:path";

const TTL_MS = 60_000;
let cache: { text: string; at: number } | null = null;

/** 產品問答的唯一事實來源；檔案不存在時回空字串，AI 就會改口說請專人回覆。 */
export async function loadFaq(): Promise<string> {
  if (cache && Date.now() - cache.at < TTL_MS) {
    return cache.text;
  }
  try {
    const text = await readFile(path.join(process.cwd(), "docs", "faq.md"), "utf8");
    cache = { text: text.trim(), at: Date.now() };
  } catch {
    cache = { text: "", at: Date.now() };
  }
  return cache.text;
}

import { chatComplete } from "@/lib/ai/client";
import { getClassifyModel, isAiEnabled } from "@/lib/ai/env";
import type { AdminTool } from "@/lib/admin/query";
import type { PeriodName } from "@/lib/order/period";
import { looksLikeAdminReport, mentionsAmend, mentionsCancel, mentionsNewOrder } from "@/lib/chat/keywords";

const SYSTEM = `你是豆腐乳店後台的查詢翻譯器。把管理員的中文轉成 json 物件，不要說明文字。
欄位：
action: sales_totals（總量／銷售）| top_customers（哪位客人買最多／排名）| list_orders（列出訂單）| help（不知道怎麼問）| not_admin（這句是客人要訂購、取消、改單、問產品或閒聊，不是查報表）
period: today | yesterday | this_week | last_week | this_month | last_month | all | custom
from, to: 僅 period=custom 時填 YYYY-MM-DD
limit: 可選整數
name: 可選，list_orders 依姓名篩選
「上週」= last_week，「上個月」= last_month。未講期間就用 this_month。`;

function parseTool(raw: string): AdminTool | { action: "not_admin" } | null {
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    const action = data.action;
    if (action === "not_admin" || action === "help") {
      return { action };
    }
    const period = (typeof data.period === "string" ? data.period : "this_month") as PeriodName;
    const allowed: PeriodName[] = [
      "today",
      "yesterday",
      "this_week",
      "last_week",
      "this_month",
      "last_month",
      "all",
      "custom",
    ];
    const safePeriod = allowed.includes(period) ? period : "this_month";
    const from = typeof data.from === "string" ? data.from : undefined;
    const to = typeof data.to === "string" ? data.to : undefined;
    const limit = typeof data.limit === "number" ? data.limit : undefined;
    const name = typeof data.name === "string" ? data.name : undefined;
    if (action === "sales_totals") {
      return { action, period: safePeriod, from, to };
    }
    if (action === "top_customers") {
      return { action, period: safePeriod, from, to, limit };
    }
    if (action === "list_orders") {
      return { action, period: safePeriod, from, to, limit, name };
    }
  } catch {
    return null;
  }
  return null;
}

function heuristicAdmin(text: string): AdminTool | { action: "not_admin" } {
  if (mentionsCancel(text) || mentionsAmend(text) || mentionsNewOrder(text)) {
    return { action: "not_admin" };
  }
  const wantsList = /列出|清單|有哪些訂單|訂單列表/.test(text);
  const wantsTop = /哪一|哪位|最大|最多|排名|採購量/.test(text);
  const wantsTotal = /總量|總共|銷售|統計|報表/.test(text);
  let period: PeriodName = "this_month";
  if (text.includes("上週") || text.includes("上周")) {
    period = "last_week";
  } else if (text.includes("上個月") || text.includes("上月")) {
    period = "last_month";
  } else if (text.includes("本週") || text.includes("這週")) {
    period = "this_week";
  } else if (text.includes("今天")) {
    period = "today";
  } else if (text.includes("昨天")) {
    period = "yesterday";
  } else if (text.includes("全部") || text.includes("至今")) {
    period = "all";
  }
  if (wantsTop) {
    return { action: "top_customers", period };
  }
  if (wantsList) {
    return { action: "list_orders", period };
  }
  if (wantsTotal) {
    return { action: "sales_totals", period };
  }
  return { action: "not_admin" };
}

export async function parseAdminQuery(
  text: string,
): Promise<AdminTool | { action: "not_admin" }> {
  const fallback = heuristicAdmin(text);
  if (!isAiEnabled()) {
    return fallback;
  }
  if (fallback.action === "not_admin" && !looksLikeAdminReport(text)) {
    return fallback;
  }
  try {
    const raw = await chatComplete({
      model: getClassifyModel(),
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: text },
      ],
      temperature: 0,
      maxTokens: 120,
      json: true,
      timeoutMs: 8_000,
    });
    return parseTool(raw) ?? fallback;
  } catch (error) {
    console.error("admin parse failed", error);
    return fallback;
  }
}

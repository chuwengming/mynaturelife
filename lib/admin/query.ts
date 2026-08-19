import { getPrisma } from "@/lib/db/prisma";
import { clipLineText, formatOrderCard } from "@/lib/order/format";
import { PRICE_PER_JAR } from "@/lib/order/options";
import { createdAtRange, resolvePeriod, type PeriodName } from "@/lib/order/period";

export type AdminTool =
  | {
      action: "sales_totals";
      period: PeriodName;
      from?: string;
      to?: string;
    }
  | {
      action: "top_customers";
      period: PeriodName;
      from?: string;
      to?: string;
      limit?: number;
    }
  | {
      action: "list_orders";
      period: PeriodName;
      from?: string;
      to?: string;
      limit?: number;
      name?: string;
    }
  | { action: "help" };

const ACTIVE = { status: "confirmed" as const };

function capLimit(value: number | undefined, fallback = 10, max = 30): number {
  if (!value || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(Math.max(Math.trunc(value), 1), max);
}

export async function runAdminTool(tool: AdminTool): Promise<string> {
  const prisma = getPrisma();
  if (!prisma) {
    return "資料庫暫時無法使用，銷售查詢請稍後再試。";
  }

  if (tool.action === "help") {
    return [
      "可以這樣問我（僅限一對一）：",
      "・請提供上週豆腐乳的訂購總量，原味及辣味要分開",
      "・上個月哪一位客人總採購量最大？",
      "・本月已成立的訂單列表",
      "統計預設只含未取消訂單；金額以每罐 280 元試算、不含運費。",
    ].join("\n");
  }

  const range = resolvePeriod(tool.period, tool.from, tool.to);
  const created = createdAtRange(range.from, range.to);
  const where = { ...ACTIVE, createdAt: created };

  if (tool.action === "sales_totals") {
    const agg = await prisma.order.aggregate({
      where,
      _sum: { plainQty: true, spicyQty: true },
      _count: { _all: true },
    });
    const plain = agg._sum.plainQty ?? 0;
    const spicy = agg._sum.spicyQty ?? 0;
    const total = plain + spicy;
    return [
      `【銷售統計】${range.label}（${range.from}～${range.to}）`,
      `成立訂單：${agg._count._all} 筆`,
      `原味：${plain} 罐`,
      `辣味：${spicy} 罐`,
      `合計：${total} 罐`,
      `金額試算：${total * PRICE_PER_JAR} 元（每罐 ${PRICE_PER_JAR} 元，不含運費）`,
    ].join("\n");
  }

  if (tool.action === "top_customers") {
    const limit = capLimit(tool.limit, 5, 15);
    const grouped = await prisma.order.groupBy({
      by: ["lineUserId"],
      where,
      _sum: { plainQty: true, spicyQty: true },
      _count: { _all: true },
    });
    const ranked = grouped
      .map((row) => {
        const plain = row._sum.plainQty ?? 0;
        const spicy = row._sum.spicyQty ?? 0;
        return {
          lineUserId: row.lineUserId,
          plain,
          spicy,
          total: plain + spicy,
          orders: row._count._all,
        };
      })
      .sort((a, b) => b.total - a.total || b.orders - a.orders)
      .slice(0, limit);

    if (ranked.length === 0) {
      return `【客排名】${range.label} 沒有已成立訂單。`;
    }

    const names = await prisma.order.findMany({
      where: { lineUserId: { in: ranked.map((row) => row.lineUserId) } },
      orderBy: { createdAt: "desc" },
      distinct: ["lineUserId"],
      select: { lineUserId: true, name: true, phone: true },
    });
    const nameById = new Map(names.map((row) => [row.lineUserId, row]));

    const lines = [
      `【客排名】${range.label}（依合計罐數，前 ${ranked.length} 名）`,
    ];
    ranked.forEach((row, index) => {
      const person = nameById.get(row.lineUserId);
      lines.push(
        `${index + 1}. ${person?.name ?? "（未留名）"}　原味 ${row.plain}／辣味 ${row.spicy}／合計 ${row.total} 罐　${row.orders} 筆`,
      );
      if (index === 0) {
        lines.push(`　→ 總採購量最大：${person?.name ?? "這位客人"}（${row.total} 罐）`);
      }
    });
    return clipLineText(lines.join("\n"));
  }

  const limit = capLimit(tool.limit, 10, 20);
  const name = tool.name?.trim();
  const orders = await prisma.order.findMany({
    where: {
      ...where,
      ...(name ? { name: { contains: name } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  if (orders.length === 0) {
    return `【訂單列表】${range.label} 沒有符合的已成立訂單。`;
  }
  const body = orders
    .map((order, index) => formatOrderCard(order, index + 1))
    .join("\n\n");
  return clipLineText(
    `【訂單列表】${range.label} 最近 ${orders.length} 筆\n\n${body}`,
  );
}

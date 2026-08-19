import { taipeiYmd } from "@/lib/order/dates";

function addDays(ymd: string, days: number): string {
  const date = new Date(`${ymd}T12:00:00+08:00`);
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  return taipeiYmd(date);
}

function mondayOf(ymd: string): string {
  const weekday = new Date(`${ymd}T12:00:00+08:00`).getUTCDay();
  const daysFromMonday = (weekday + 6) % 7;
  return addDays(ymd, -daysFromMonday);
}

function monthStart(ymd: string): string {
  return `${ymd.slice(0, 7)}-01`;
}

function lastMonthRange(today: string): { from: string; to: string } {
  const thisStart = monthStart(today);
  const lastEnd = addDays(thisStart, -1);
  return { from: monthStart(lastEnd), to: lastEnd };
}

export type DateRange = { from: string; to: string; label: string };

export type PeriodName =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "all"
  | "custom";

export function resolvePeriod(
  period: PeriodName,
  customFrom?: string,
  customTo?: string,
  now = new Date(),
): DateRange {
  const today = taipeiYmd(now);
  if (period === "custom" && customFrom && customTo) {
    const from = customFrom <= customTo ? customFrom : customTo;
    const to = customFrom <= customTo ? customTo : customFrom;
    return { from, to, label: `${from}～${to}` };
  }
  if (period === "yesterday") {
    const y = addDays(today, -1);
    return { from: y, to: y, label: "昨天" };
  }
  if (period === "this_week") {
    const from = mondayOf(today);
    return { from, to: today, label: "本週（週一至今）" };
  }
  if (period === "last_week") {
    const thisMonday = mondayOf(today);
    const from = addDays(thisMonday, -7);
    const to = addDays(thisMonday, -1);
    return { from, to, label: "上週（週一至週日）" };
  }
  if (period === "this_month") {
    return { from: monthStart(today), to: today, label: "本月" };
  }
  if (period === "last_month") {
    const range = lastMonthRange(today);
    return { ...range, label: "上個月" };
  }
  if (period === "all") {
    return { from: "2000-01-01", to: today, label: "全部期間" };
  }
  return { from: today, to: today, label: "今天" };
}

/** 以台北日曆日篩選 createdAt。 */
export function createdAtRange(fromYmd: string, toYmd: string): { gte: Date; lt: Date } {
  return {
    gte: new Date(`${fromYmd}T00:00:00+08:00`),
    lt: new Date(`${addDays(toYmd, 1)}T00:00:00+08:00`),
  };
}

const TAIPEI = "Asia/Taipei";

export function taipeiYmd(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TAIPEI }).format(date);
}

function addCalendarDays(ymd: string, days: number): string {
  const [year, month, day] = ymd.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  const yyyy = next.getUTCFullYear();
  const mm = String(next.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(next.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function minBookingDateYmd(): string {
  return addCalendarDays(taipeiYmd(), 1);
}

export function isYmd(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function toDateOnlyUtc(ymd: string): Date {
  return new Date(`${ymd}T00:00:00.000Z`);
}

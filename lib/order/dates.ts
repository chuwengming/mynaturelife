const TAIPEI = "Asia/Taipei";

export function taipeiYmd(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TAIPEI }).format(date);
}

export function minOrderDateYmd(): string {
  return taipeiYmd();
}

export function isYmd(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function toDateOnlyUtc(ymd: string): Date {
  return new Date(`${ymd}T00:00:00.000Z`);
}

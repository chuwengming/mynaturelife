import { BookingForm } from "./booking-form";

export const dynamic = "force-dynamic";

export default function LiffBookingPage() {
  const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID ?? process.env.LINE_LIFF_ID ?? "";

  return (
    <main className="booking-shell mx-auto flex min-h-full max-w-md flex-col px-6 py-12">
      <p className="font-display text-xs tracking-[0.28em] text-moss/70">我的自然生活</p>
      <h1 className="mt-3 font-display text-4xl font-medium tracking-tight">預約諮詢</h1>
      <p className="mt-3 max-w-sm leading-7 text-moss/80">
        送出即成立。請填寫日期與時段，我們會再與你確認細節。
      </p>
      {liffId ? (
        <BookingForm liffId={liffId} />
      ) : (
        <p className="mt-8 leading-7 text-clay">伺服器尚未設定 LIFF ID。</p>
      )}
    </main>
  );
}

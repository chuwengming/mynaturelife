export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <p className="font-display text-sm tracking-[0.28em] text-moss uppercase">
        我的自然生活
      </p>
      <h1 className="mt-4 font-display text-4xl font-medium tracking-tight">
        訂購與諮詢服務
      </h1>
      <p className="mt-4 max-w-md text-center text-lg leading-8 text-moss/80">
        請從 LINE 官方帳號或專設群組進入。傳「訂購」即可開啟表單，送出即成立。
      </p>
      <ul className="mt-10 w-full max-w-md space-y-3 rounded-2xl bg-paper px-6 py-5 text-sm leading-7 shadow-[0_12px_40px_rgba(44,58,46,0.06)]">
        <li>Webhook：<code>/api/line/webhook</code></li>
        <li>健康檢查：<code>/api/health</code></li>
        <li>訂購頁：<code>/liff/booking</code></li>
      </ul>
    </main>
  );
}

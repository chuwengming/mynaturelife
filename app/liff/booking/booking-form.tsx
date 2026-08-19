"use client";

import { useEffect, useMemo, useState } from "react";
import type { Liff } from "@liff/liff-types";
import { BOOKING_ITEMS, BOOKING_SLOTS } from "@/lib/booking/options";
import { minBookingDateYmd } from "@/lib/booking/dates";

type Props = { liffId: string };

type Source = { sourceType: "user" | "group" | "room"; sourceId: string };

let liffReady: Promise<Liff> | null = null;

async function loadLiff(liffId: string): Promise<Liff> {
  if (!liffReady) {
    liffReady = import("@line/liff")
      .then(async ({ default: liff }) => {
        if (!liff.id) {
          await liff.init({
            liffId,
            withLoginOnExternalBrowser: true,
          });
        }
        return liff;
      })
      .catch((error) => {
        liffReady = null;
        throw error;
      });
  }
  return liffReady;
}

function formatLiffError(cause: unknown): string {
  const record = cause as { code?: string; message?: string };
  const code = record?.code ?? "";
  const message = record?.message ?? (cause instanceof Error ? cause.message : "");
  const combined = `${code} ${message}`.toLowerCase();

  if (combined.includes("invalid liff id") || code === "INVALID_LIFF_ID") {
    return "LIFF ID 無效。請核對 Railway 變數 NEXT_PUBLIC_LINE_LIFF_ID 與 LINE Console 顯示的 ID。";
  }
  if (
    combined.includes("endpoint") ||
    combined.includes("origin") ||
    code === "INVALID_CONFIG"
  ) {
    return "目前網址與 LIFF Endpoint URL 不一致。請在 LINE Console 設成 https://web-production-1ee6b.up.railway.app/liff/booking";
  }
  return `無法啟動 LINE 登入${code ? `（${code}）` : ""}。請從聊天室傳「預約」開啟；若用瀏覽器，請在 LINE Login 的 Callback URL 加入 https://web-production-1ee6b.up.railway.app`;
}

export function BookingForm({ liffId }: Props) {
  const minDate = useMemo(() => minBookingDateYmd(), []);
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [source, setSource] = useState<Source>({ sourceType: "user", sourceId: "" });
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bookingDate, setBookingDate] = useState(minDate);
  const [bookingSlot, setBookingSlot] = useState<(typeof BOOKING_SLOTS)[number]["value"]>("morning");
  const [bookingItem, setBookingItem] = useState<(typeof BOOKING_ITEMS)[number]["value"]>("lifestyle");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [liffClient, setLiffClient] = useState<Liff | null>(null);

  useEffect(() => {
    if (!liffId) {
      setInitError("尚未設定 LIFF ID。");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const liff = await loadLiff(liffId);
        if (cancelled) {
          return;
        }
        if (!liff.isLoggedIn()) {
          liff.login({
            redirectUri: window.location.href.split("#")[0],
          });
          return;
        }
        const profile = await liff.getProfile();
        const context = liff.getContext();
        if (cancelled) {
          return;
        }
        setLiffClient(liff);
        setDisplayName(profile.displayName);
        setName((current) => current || profile.displayName);
        if (context?.type === "group" && context.groupId) {
          setSource({ sourceType: "group", sourceId: context.groupId });
        } else if (context?.type === "room" && context.roomId) {
          setSource({ sourceType: "room", sourceId: context.roomId });
        } else {
          setSource({ sourceType: "user", sourceId: profile.userId });
        }
        setReady(true);
      } catch (cause) {
        console.error(cause);
        if (!cancelled) {
          setInitError(formatLiffError(cause));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [liffId]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const idToken = liffClient?.getIDToken();
      if (!idToken) {
        throw new Error("缺少登入憑證，請關閉頁面後再試。");
      }
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          name,
          phone,
          bookingDate,
          bookingSlot,
          bookingItem,
          notes,
          sourceType: source.sourceType,
          sourceId: source.sourceId,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "送出失敗");
      }
      setDone(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "送出失敗");
    } finally {
      setSubmitting(false);
    }
  }

  if (initError) {
    return <p className="mt-8 leading-7 text-clay">{initError}</p>;
  }

  if (!ready) {
    return <p className="mt-8 tracking-wide text-moss/80">正在連線 LINE…</p>;
  }

  if (done) {
    return (
      <section className="booking-slip mt-8 px-6 py-8">
        <p className="font-display text-sm tracking-[0.2em] text-clay">已成立</p>
        <h2 className="mt-2 font-display text-3xl">預約已收下</h2>
        <p className="mt-4 leading-7 text-moss/85">
          {displayName}，我們會依你選擇的日期與時段聯繫。可關閉此頁回到聊天室。
        </p>
      </section>
    );
  }

  return (
    <form className="booking-slip mt-8 px-6 py-7" onSubmit={onSubmit}>
      <label className="block">
        <span className="field-label">姓名</span>
        <input
          required
          className="field-input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="name"
        />
      </label>
      <label className="mt-4 block">
        <span className="field-label">聯絡電話</span>
        <input
          required
          className="field-input"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          inputMode="tel"
          autoComplete="tel"
          placeholder="09xxxxxxxx"
        />
      </label>
      <label className="mt-4 block">
        <span className="field-label">預約日期</span>
        <input
          required
          type="date"
          className="field-input"
          min={minDate}
          value={bookingDate}
          onChange={(event) => setBookingDate(event.target.value)}
        />
      </label>
      <fieldset className="mt-5">
        <legend className="field-label">預約時段</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {BOOKING_SLOTS.map((slot) => (
            <label
              key={slot.value}
              className={`chip ${bookingSlot === slot.value ? "chip-on" : ""}`}
            >
              <input
                type="radio"
                className="sr-only"
                name="bookingSlot"
                value={slot.value}
                checked={bookingSlot === slot.value}
                onChange={() => setBookingSlot(slot.value)}
              />
              {slot.label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="mt-5 block">
        <span className="field-label">預約項目</span>
        <select
          className="field-input"
          value={bookingItem}
          onChange={(event) =>
            setBookingItem(event.target.value as (typeof BOOKING_ITEMS)[number]["value"])
          }
        >
          {BOOKING_ITEMS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <label className="mt-4 block">
        <span className="field-label">備註（選填）</span>
        <textarea
          className="field-input min-h-24"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          maxLength={500}
        />
      </label>
      {error ? <p className="mt-4 text-sm leading-6 text-clay">{error}</p> : null}
      <button className="submit-seal mt-6" type="submit" disabled={submitting}>
        {submitting ? "送出中…" : "送出預約"}
      </button>
    </form>
  );
}

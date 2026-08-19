"use client";

import { useEffect, useMemo, useState } from "react";
import type { Liff } from "@liff/liff-types";
import { DELIVERY_MIN_QTY, MAX_QTY_PER_FLAVOR, ORDER_ITEMS } from "@/lib/order/options";
import { minOrderDateYmd } from "@/lib/order/dates";
import { formatReasons, parseQty, validateOrder } from "@/lib/order/validate";

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

type LiffStage = "init" | "login" | "profile";

function describeCause(cause: unknown): string {
  const record = cause as { code?: string; message?: string };
  const code = record?.code ?? "";
  const message = record?.message ?? (cause instanceof Error ? cause.message : "");
  return [code, message].filter(Boolean).join(" / ") || String(cause);
}

function formatLiffError(stage: LiffStage, cause: unknown): string {
  const detail = describeCause(cause);
  const code = (cause as { code?: string })?.code ?? "";

  if (code === "INVALID_LIFF_ID") {
    return `LIFF ID 無效（${detail}）。請核對 Railway 變數 NEXT_PUBLIC_LINE_LIFF_ID。`;
  }
  if (code === "INVALID_CONFIG") {
    return `LIFF 設定與目前網址不符（${detail}）。請把 LIFF 分頁的 Endpoint URL 設成 https://web-production-1ee6b.up.railway.app/liff/booking`;
  }
  if (stage === "init") {
    return `LIFF 初始化失敗（${detail}）。若為 FORBIDDEN：多為 LIFF 的「Add friend option」需要已連結的官方帳號，或此環境不支援。`;
  }
  return `LINE 授權步驟失敗（階段：${stage}，${detail}）`;
}

export function OrderForm({ liffId }: Props) {
  const minDate = useMemo(() => minOrderDateYmd(), []);
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [source, setSource] = useState<Source>({ sourceType: "user", sourceId: "" });
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [orderDate, setOrderDate] = useState(minDate);
  const [orderItem, setOrderItem] = useState<(typeof ORDER_ITEMS)[number]["value"]>(
    ORDER_ITEMS[0].value,
  );
  const [plainQty, setPlainQty] = useState("");
  const [spicyQty, setSpicyQty] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [liffClient, setLiffClient] = useState<Liff | null>(null);

  const totalQty = (parseQty(plainQty) ?? 0) + (parseQty(spicyQty) ?? 0);
  const needsAddress = totalQty >= DELIVERY_MIN_QTY;

  useEffect(() => {
    if (!liffId) {
      setInitError("尚未設定 LIFF ID。");
      return;
    }

    if (window.self !== window.top) {
      setInitError(
        "請不要用嵌入式預覽開啟。請用手機 LINE App 聊天室傳「訂購」，或用獨立瀏覽器分頁開啟。",
      );
      return;
    }

    let cancelled = false;
    (async () => {
      let liff: Liff;
      try {
        liff = await loadLiff(liffId);
      } catch (cause) {
        console.error("liff.init failed", cause);
        if (!cancelled) {
          setInitError(formatLiffError("init", cause));
        }
        return;
      }
      if (cancelled) {
        return;
      }

      try {
        if (!liff.isLoggedIn()) {
          liff.login({ redirectUri: window.location.href.split("#")[0] });
          return;
        }
      } catch (cause) {
        console.error("liff.login failed", cause);
        if (!cancelled) {
          setInitError(formatLiffError("login", cause));
        }
        return;
      }

      const context = liff.getContext();
      if (context?.type === "group" && context.groupId) {
        setSource({ sourceType: "group", sourceId: context.groupId });
      } else if (context?.type === "room" && context.roomId) {
        setSource({ sourceType: "room", sourceId: context.roomId });
      }

      try {
        const profile = await liff.getProfile();
        if (cancelled) {
          return;
        }
        setDisplayName(profile.displayName);
        setName((current) => current || profile.displayName);
      } catch (cause) {
        console.error("liff.getProfile failed", cause);
      }

      if (!cancelled) {
        setLiffClient(liff);
        setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [liffId]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const validation = validateOrder({
      name,
      phone,
      orderDate,
      orderItem,
      plainQty,
      spicyQty,
      address,
      notes,
    });
    if (!validation.ok) {
      setError(formatReasons(validation.reasons));
      return;
    }

    setSubmitting(true);
    try {
      const idToken = liffClient?.getIDToken();
      if (!idToken) {
        throw new Error(
          "取不到登入憑證，請確認 LIFF 的 Scope 已勾選 openid，然後重新開啟此頁。",
        );
      }
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          name,
          phone,
          orderDate,
          orderItem,
          plainQty,
          spicyQty,
          address,
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
        <h2 className="mt-2 font-display text-3xl">訂單已收下</h2>
        <p className="mt-4 leading-7 text-moss/85">
          {displayName}，我們會依你填寫的內容與你聯繫。可關閉此頁回到聊天室。
        </p>
      </section>
    );
  }

  return (
    <form className="booking-slip mt-8 px-6 py-7" onSubmit={onSubmit}>
      <p className="mb-5 text-sm leading-6 text-clay">
        * 訂購{DELIVERY_MIN_QTY}罐(含)以上者可以宅配(運費另計)，務必填寫地址
      </p>
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
        <span className="field-label">訂購日期</span>
        <input
          required
          type="date"
          className="field-input"
          min={minDate}
          value={orderDate}
          onChange={(event) => setOrderDate(event.target.value)}
        />
      </label>
      <label className="mt-4 block">
        <span className="field-label">訂購項目</span>
        <select
          className="field-input"
          value={orderItem}
          onChange={(event) =>
            setOrderItem(event.target.value as (typeof ORDER_ITEMS)[number]["value"])
          }
        >
          {ORDER_ITEMS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="field-label">原味數量</span>
          <input
            type="number"
            className="field-input"
            min={0}
            max={MAX_QTY_PER_FLAVOR}
            step={1}
            inputMode="numeric"
            value={plainQty}
            onChange={(event) => setPlainQty(event.target.value)}
            placeholder="0"
          />
        </label>
        <label className="block">
          <span className="field-label">辣味數量</span>
          <input
            type="number"
            className="field-input"
            min={0}
            max={MAX_QTY_PER_FLAVOR}
            step={1}
            inputMode="numeric"
            value={spicyQty}
            onChange={(event) => setSpicyQty(event.target.value)}
            placeholder="0"
          />
        </label>
      </div>
      <label className="mt-4 block">
        <span className="field-label">
          地址（選填{needsAddress ? "，需宅配請填寫" : ""}）
        </span>
        <input
          className="field-input"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          autoComplete="street-address"
          placeholder="縣市 / 鄉鎮區 / 路街巷弄號樓"
        />
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
      {error ? (
        <p className="mt-4 whitespace-pre-line text-sm leading-6 text-clay">{error}</p>
      ) : null}
      <button className="submit-seal mt-6" type="submit" disabled={submitting}>
        {submitting ? "送出中…" : "送出訂單"}
      </button>
    </form>
  );
}

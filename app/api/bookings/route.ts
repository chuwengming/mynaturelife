import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/prisma";
import {
  isBookingItem,
  isBookingSlot,
} from "@/lib/booking/options";
import { isYmd, minBookingDateYmd, toDateOnlyUtc } from "@/lib/booking/dates";
import { notifyBookingConfirmed } from "@/lib/line/notify-booking";
import { verifyLineIdToken } from "@/lib/line/verify-id-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BookingBody = {
  idToken?: unknown;
  name?: unknown;
  phone?: unknown;
  bookingDate?: unknown;
  bookingSlot?: unknown;
  bookingItem?: unknown;
  notes?: unknown;
  sourceType?: unknown;
  sourceId?: unknown;
};

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseSource(
  sourceTypeRaw: string,
  sourceIdRaw: string,
  lineUserId: string,
): { sourceType: string; sourceId: string } | { error: string } {
  if (sourceTypeRaw === "group") {
    if (!/^C[0-9a-f]{32}$/i.test(sourceIdRaw)) {
      return { error: "invalid group id" };
    }
    return { sourceType: "group", sourceId: sourceIdRaw };
  }
  if (sourceTypeRaw === "room") {
    if (!/^R[0-9a-f]{32}$/i.test(sourceIdRaw)) {
      return { error: "invalid room id" };
    }
    return { sourceType: "room", sourceId: sourceIdRaw };
  }
  return { sourceType: "user", sourceId: lineUserId };
}

export async function POST(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: "database unavailable" }, { status: 503 });
  }

  let body: BookingBody;
  try {
    body = (await request.json()) as BookingBody;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const idToken = asTrimmedString(body.idToken);
  if (!idToken) {
    return NextResponse.json({ error: "missing id token" }, { status: 401 });
  }

  let identity: { lineUserId: string; displayName: string | null };
  try {
    identity = await verifyLineIdToken(idToken);
  } catch {
    return NextResponse.json({ error: "invalid id token" }, { status: 401 });
  }

  const name = asTrimmedString(body.name);
  const phone = asTrimmedString(body.phone).replace(/\s+/g, "");
  const bookingDate = asTrimmedString(body.bookingDate);
  const bookingSlot = asTrimmedString(body.bookingSlot);
  const bookingItem = asTrimmedString(body.bookingItem);
  const notes = asTrimmedString(body.notes) || null;
  const minDate = minBookingDateYmd();

  if (!name) {
    return NextResponse.json({ error: "請填寫姓名" }, { status: 400 });
  }
  if (!/^[\d+\-()]{8,20}$/.test(phone)) {
    return NextResponse.json({ error: "請填寫有效電話" }, { status: 400 });
  }
  if (!isYmd(bookingDate) || bookingDate < minDate) {
    return NextResponse.json({ error: "請選擇明天以後的預約日期" }, { status: 400 });
  }
  if (!isBookingSlot(bookingSlot)) {
    return NextResponse.json({ error: "請選擇預約時段" }, { status: 400 });
  }
  if (!isBookingItem(bookingItem)) {
    return NextResponse.json({ error: "請選擇預約項目" }, { status: 400 });
  }

  const source = parseSource(
    asTrimmedString(body.sourceType),
    asTrimmedString(body.sourceId),
    identity.lineUserId,
  );
  if ("error" in source) {
    return NextResponse.json({ error: source.error }, { status: 400 });
  }

  const booking = await prisma.$transaction(async (tx) => {
    await tx.user.upsert({
      where: { lineUserId: identity.lineUserId },
      update: { displayName: identity.displayName ?? name },
      create: {
        lineUserId: identity.lineUserId,
        displayName: identity.displayName ?? name,
      },
    });

    return tx.booking.create({
      data: {
        lineUserId: identity.lineUserId,
        name,
        phone,
        bookingDate: toDateOnlyUtc(bookingDate),
        bookingSlot,
        bookingItem,
        notes,
        status: "confirmed",
        sourceType: source.sourceType,
        sourceId: source.sourceId,
      },
    });
  });

  await notifyBookingConfirmed({
    lineUserId: identity.lineUserId,
    name,
    phone,
    bookingDate,
    bookingSlot,
    bookingItem,
    notes,
    sourceType: source.sourceType,
    sourceId: source.sourceId,
  });

  return NextResponse.json({
    ok: true,
    bookingId: booking.id,
    status: booking.status,
  });
}

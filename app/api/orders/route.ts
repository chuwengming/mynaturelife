import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/prisma";
import { toDateOnlyUtc } from "@/lib/order/dates";
import { formatReasons, validateOrder, type OrderInput } from "@/lib/order/validate";
import { notifyOrderConfirmed } from "@/lib/line/notify-order";
import { verifyLineIdToken } from "@/lib/line/verify-id-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OrderBody = OrderInput & {
  idToken?: unknown;
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

  let body: OrderBody;
  try {
    body = (await request.json()) as OrderBody;
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

  const validation = validateOrder(body);
  if (!validation.ok) {
    return NextResponse.json(
      { error: formatReasons(validation.reasons), reasons: validation.reasons },
      { status: 400 },
    );
  }
  const input = validation.order;

  const source = parseSource(
    asTrimmedString(body.sourceType),
    asTrimmedString(body.sourceId),
    identity.lineUserId,
  );
  if ("error" in source) {
    return NextResponse.json({ error: source.error }, { status: 400 });
  }

  const order = await prisma.$transaction(async (tx) => {
    await tx.user.upsert({
      where: { lineUserId: identity.lineUserId },
      update: { displayName: identity.displayName ?? input.name },
      create: {
        lineUserId: identity.lineUserId,
        displayName: identity.displayName ?? input.name,
      },
    });

    return tx.order.create({
      data: {
        lineUserId: identity.lineUserId,
        name: input.name,
        phone: input.phone,
        orderDate: toDateOnlyUtc(input.orderDate),
        orderItem: input.orderItem,
        plainQty: input.plainQty,
        spicyQty: input.spicyQty,
        address: input.address,
        notes: input.notes,
        status: "confirmed",
        sourceType: source.sourceType,
        sourceId: source.sourceId,
      },
    });
  });

  await notifyOrderConfirmed({
    lineUserId: identity.lineUserId,
    name: input.name,
    phone: input.phone,
    orderDate: input.orderDate,
    orderItem: input.orderItem,
    plainQty: input.plainQty,
    spicyQty: input.spicyQty,
    address: input.address,
    notes: input.notes,
    sourceType: source.sourceType,
    sourceId: source.sourceId,
  });

  return NextResponse.json({
    ok: true,
    orderId: order.id,
    status: order.status,
  });
}

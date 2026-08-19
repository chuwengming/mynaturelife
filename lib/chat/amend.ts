import type { Order } from "@prisma/client";
import { getPrisma } from "@/lib/db/prisma";
import { parseFlowJson, type OrderFlow } from "@/lib/chat/flow";
import { updateConversation } from "@/lib/chat/conversation";
import {
  mentionsAbortFlow,
  mentionsAmend,
  mentionsCancel,
  mentionsConfirm,
  mentionsNewOrder,
  parseListIndex,
} from "@/lib/chat/keywords";
import { formatOrderCard } from "@/lib/order/format";
import { toDateOnlyUtc } from "@/lib/order/dates";
import {
  applyPatch,
  describePatch,
  parseOrderPatch,
  type OrderPatch,
} from "@/lib/order/patch";
import { notifyOrderChanged } from "@/lib/line/notify-order";

const NO_DB = "資料庫暫時無法使用，改單請稍後再試，或直接傳「訂購」重新下單。";
const NO_ORDERS = "目前沒有查到你名下已成立的訂單。若要新訂購，請傳「訂購」。";
const ABORTED = "好的，這次先不改訂單。之後若要取消或更改，隨時跟我說。";

async function activeOrders(lineUserId: string): Promise<Order[]> {
  const prisma = getPrisma();
  if (!prisma) {
    return [];
  }
  return prisma.order.findMany({
    where: { lineUserId, status: "confirmed" },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
}

async function orderById(id: string, lineUserId: string): Promise<Order | null> {
  const prisma = getPrisma();
  if (!prisma) {
    return null;
  }
  return prisma.order.findFirst({
    where: { id, lineUserId, status: "confirmed" },
  });
}

async function setFlow(key: string, flow: OrderFlow | null, lastIntent: string): Promise<void> {
  await updateConversation(key, {
    lastIntent,
    smalltalkTurns: 0,
    closedAt: null,
    flowJson: flow ? JSON.stringify(flow) : null,
  });
}

function listText(orders: Order[], kind: "cancel" | "amend"): string {
  const heading =
    kind === "cancel"
      ? "這是你目前已成立的訂單。請回覆編號（例如 1）告訴我要取消哪一筆；若都不取消，請回「不用了」。"
      : "這是你目前已成立的訂單。請回覆編號（例如 1）告訴我要更改哪一筆；若都不改，請回「不用了」。";
  const cards = orders.map((order, index) => formatOrderCard(order, index + 1)).join("\n\n");
  return `${heading}\n\n${cards}`;
}

async function startKind(
  conversationKey: string,
  lineUserId: string,
  kind: "cancel" | "amend",
): Promise<string> {
  const prisma = getPrisma();
  if (!prisma) {
    return NO_DB;
  }
  const orders = await activeOrders(lineUserId);
  if (orders.length === 0) {
    await setFlow(conversationKey, null, kind);
    return NO_ORDERS;
  }
  if (orders.length === 1) {
    const order = orders[0];
    if (kind === "cancel") {
      await setFlow(conversationKey, { kind: "cancel", step: "confirm", orderId: order.id }, "cancel");
      return `請確認是否取消這一筆：\n\n${formatOrderCard(order)}\n\n確定取消請回「確定」；要保留請回「不用了」。`;
    }
    await setFlow(conversationKey, { kind: "amend", step: "change", orderId: order.id }, "amend");
    return `目前這一筆訂單如下：\n\n${formatOrderCard(order)}\n\n請告訴我要改哪些內容（例如：原味改成 2 罐、地址改為……）。若不用改，請回「不用了」。`;
  }
  await setFlow(
    conversationKey,
    { kind, step: "pick", orderIds: orders.map((order) => order.id) },
    kind,
  );
  return listText(orders, kind);
}

async function pickOrder(
  conversationKey: string,
  lineUserId: string,
  text: string,
  flow: Extract<OrderFlow, { step: "pick" }>,
): Promise<string> {
  const index = parseListIndex(text, flow.orderIds.length);
  if (index === null) {
    return `請回覆 1 到 ${flow.orderIds.length} 的編號，或回「不用了」結束。`;
  }
  const order = await orderById(flow.orderIds[index], lineUserId);
  if (!order) {
    await setFlow(conversationKey, null, flow.kind);
    return "找不到這一筆訂單，可能已取消。請再說一次「取消訂購」或「更改訂購」。";
  }
  if (flow.kind === "cancel") {
    await setFlow(conversationKey, { kind: "cancel", step: "confirm", orderId: order.id }, "cancel");
    return `請確認是否取消：\n\n${formatOrderCard(order)}\n\n確定請回「確定」；要保留請回「不用了」。`;
  }
  await setFlow(conversationKey, { kind: "amend", step: "change", orderId: order.id }, "amend");
  return `要改的是這一筆：\n\n${formatOrderCard(order)}\n\n請說明要改的內容。`;
}

async function confirmCancel(
  conversationKey: string,
  lineUserId: string,
  text: string,
  orderId: string,
): Promise<string> {
  if (!mentionsConfirm(text) && !mentionsCancel(text)) {
    return "請回「確定」以取消訂單，或回「不用了」保留訂單。";
  }
  const prisma = getPrisma();
  if (!prisma) {
    return NO_DB;
  }
  const order = await orderById(orderId, lineUserId);
  if (!order) {
    await setFlow(conversationKey, null, "cancel");
    return "這一筆已不存在或已取消。";
  }
  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { status: "cancelled" },
  });
  await setFlow(conversationKey, null, "cancel_done");
  await notifyOrderChanged(updated, "cancelled");
  return `已取消訂單 ${order.id.slice(-6)}。資料庫已更新。若要重新訂購，請傳「訂購」。`;
}

async function collectPatch(
  conversationKey: string,
  lineUserId: string,
  text: string,
  orderId: string,
): Promise<string> {
  const order = await orderById(orderId, lineUserId);
  if (!order) {
    await setFlow(conversationKey, null, "amend");
    return "這一筆已不存在或已取消。";
  }
  const patch = await parseOrderPatch(text);
  if (!patch) {
    return "我還沒看懂要改哪裡。請具體說，例如「辣味改 3 罐」或「地址改為台中市……」。";
  }
  const applied = applyPatch(order, patch);
  if (!applied.ok) {
    return `這次無法更改，原因：\n${applied.reasons.map((reason) => `・${reason}`).join("\n")}\n訂單尚未更動，請再說明一次。`;
  }
  await setFlow(
    conversationKey,
    { kind: "amend", step: "confirm", orderId, patch: patch as Record<string, unknown> },
    "amend",
  );
  return `將做這些更改：\n${describePatch(patch)}\n\n確定請回「確定」；要重說請直接再傳一次更改內容；放棄請回「不用了」。`;
}

async function confirmAmend(
  conversationKey: string,
  lineUserId: string,
  text: string,
  orderId: string,
  patchRecord: Record<string, unknown>,
): Promise<string> {
  if (mentionsAmend(text) || /原味|辣味|地址|電話|日期/.test(text)) {
    return collectPatch(conversationKey, lineUserId, text, orderId);
  }
  if (!mentionsConfirm(text)) {
    return "請回「確定」完成更改，或再傳一次要改的內容。";
  }
  const prisma = getPrisma();
  if (!prisma) {
    return NO_DB;
  }
  const order = await orderById(orderId, lineUserId);
  if (!order) {
    await setFlow(conversationKey, null, "amend");
    return "這一筆已不存在或已取消。";
  }
  const patch = patchRecord as OrderPatch;
  const applied = applyPatch(order, patch);
  if (!applied.ok) {
    return `無法寫入：\n${applied.reasons.map((reason) => `・${reason}`).join("\n")}`;
  }
  const next = applied.next;
  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      name: next.name,
      phone: next.phone,
      orderDate: toDateOnlyUtc(next.orderDate),
      orderItem: next.orderItem,
      plainQty: next.plainQty,
      spicyQty: next.spicyQty,
      address: next.address,
      notes: next.notes,
    },
  });
  await setFlow(conversationKey, null, "amend_done");
  await notifyOrderChanged(updated, "updated");
  return `訂單已更新：\n\n${formatOrderCard(updated)}`;
}

export async function startOrderFlow(
  conversationKey: string,
  lineUserId: string,
  kind: "cancel" | "amend",
): Promise<string> {
  return startKind(conversationKey, lineUserId, kind);
}

export async function continueOrderFlow(
  conversationKey: string,
  lineUserId: string,
  text: string,
  flowJson: string | null,
): Promise<string | null> {
  const flow = parseFlowJson(flowJson);
  if (!flow) {
    return null;
  }
  if (mentionsAbortFlow(text)) {
    await setFlow(conversationKey, null, "flow_aborted");
    return ABORTED;
  }
  if (mentionsNewOrder(text)) {
    await setFlow(conversationKey, null, "flow_aborted");
    return null;
  }
  if (mentionsCancel(text) && flow.kind === "amend") {
    return startKind(conversationKey, lineUserId, "cancel");
  }
  if (flow.step === "pick") {
    return pickOrder(conversationKey, lineUserId, text, flow);
  }
  if (flow.kind === "cancel" && flow.step === "confirm") {
    return confirmCancel(conversationKey, lineUserId, text, flow.orderId);
  }
  if (flow.kind === "amend" && flow.step === "change") {
    return collectPatch(conversationKey, lineUserId, text, flow.orderId);
  }
  if (flow.kind === "amend" && flow.step === "confirm") {
    return confirmAmend(conversationKey, lineUserId, text, flow.orderId, flow.patch);
  }
  return null;
}

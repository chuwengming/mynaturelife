import { getAdminLineUserIds } from "@/lib/line/env";
import { pushText } from "@/lib/line/messages";
import { labelForItem, labelForSlot } from "@/lib/booking/options";

export type BookingNotice = {
  lineUserId: string;
  name: string;
  phone: string;
  bookingDate: string;
  bookingSlot: string;
  bookingItem: string;
  notes: string | null;
  sourceType: string;
  sourceId: string;
};

function formatBooking(notice: BookingNotice, heading: string): string {
  const lines = [
    heading,
    `姓名：${notice.name}`,
    `電話：${notice.phone}`,
    `預約日期：${notice.bookingDate}`,
    `預約時段：${labelForSlot(notice.bookingSlot)}`,
    `預約項目：${labelForItem(notice.bookingItem)}`,
  ];
  if (notice.notes) {
    lines.push(`備註：${notice.notes}`);
  }
  lines.push("狀態：已成立");
  return lines.join("\n");
}

export async function notifyBookingConfirmed(notice: BookingNotice): Promise<void> {
  const conversationId =
    notice.sourceType === "group" || notice.sourceType === "room"
      ? notice.sourceId
      : notice.lineUserId;

  const userText = formatBooking(notice, "預約已成立，我們會依此時段與你聯繫。");
  const adminText = formatBooking(notice, "有一筆新預約已成立。");

  const jobs: Array<{ to: string; text: string }> = [
    { to: conversationId, text: userText },
  ];

  for (const adminId of getAdminLineUserIds()) {
    if (adminId === conversationId) {
      continue;
    }
    jobs.push({ to: adminId, text: adminText });
  }

  for (const job of jobs) {
    try {
      await pushText(job.to, job.text);
    } catch (error) {
      console.error("LINE push failed", { toKind: job.to.slice(0, 1), error });
    }
  }
}

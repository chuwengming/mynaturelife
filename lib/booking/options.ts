export const BOOKING_SLOTS = [
  { value: "morning", label: "上午" },
  { value: "afternoon", label: "下午" },
  { value: "evening", label: "晚上" },
] as const;

export const BOOKING_ITEMS = [
  { value: "lifestyle", label: "生活型態" },
  { value: "nutrition", label: "飲食營養" },
  { value: "wellness", label: "身心調理" },
  { value: "nature", label: "環境與自然" },
  { value: "other", label: "其他" },
] as const;

export type BookingSlotValue = (typeof BOOKING_SLOTS)[number]["value"];
export type BookingItemValue = (typeof BOOKING_ITEMS)[number]["value"];

export function isBookingSlot(value: string): value is BookingSlotValue {
  return BOOKING_SLOTS.some((slot) => slot.value === value);
}

export function isBookingItem(value: string): value is BookingItemValue {
  return BOOKING_ITEMS.some((item) => item.value === value);
}

export function labelForSlot(value: string): string {
  return BOOKING_SLOTS.find((slot) => slot.value === value)?.label ?? value;
}

export function labelForItem(value: string): string {
  return BOOKING_ITEMS.find((item) => item.value === value)?.label ?? value;
}

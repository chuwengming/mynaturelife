export type OrderFlow = {
  speakerId: string;
} & (
  | { kind: "cancel" | "amend"; step: "pick"; orderIds: string[] }
  | { kind: "cancel"; step: "confirm"; orderId: string }
  | { kind: "amend"; step: "change"; orderId: string }
  | {
      kind: "amend";
      step: "confirm";
      orderId: string;
      patch: Record<string, unknown>;
    }
);

export function parseFlowJson(raw: string | null | undefined): OrderFlow | null {
  if (!raw) {
    return null;
  }
  try {
    const data = JSON.parse(raw) as OrderFlow;
    if (data.kind !== "cancel" && data.kind !== "amend") {
      return null;
    }
    if (!data.speakerId) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

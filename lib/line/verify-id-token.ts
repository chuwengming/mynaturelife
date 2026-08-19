export type VerifiedLineUser = {
  lineUserId: string;
  displayName: string | null;
};

type LineIdTokenPayload = {
  sub?: string;
  name?: string;
  error?: string;
  error_description?: string;
};

export async function verifyLineIdToken(idToken: string): Promise<VerifiedLineUser> {
  const clientId = process.env.LINE_LOGIN_CHANNEL_ID;
  if (!clientId) {
    throw new Error("LINE_LOGIN_CHANNEL_ID is not set");
  }

  const body = new URLSearchParams();
  body.set("id_token", idToken);
  body.set("client_id", clientId);

  const response = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const payload = (await response.json()) as LineIdTokenPayload;
  if (!response.ok || !payload.sub) {
    throw new Error(payload.error_description ?? payload.error ?? "invalid id token");
  }

  return {
    lineUserId: payload.sub,
    displayName: payload.name ?? null,
  };
}

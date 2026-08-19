export function getLineChannelSecret(): string {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret) {
    throw new Error("LINE_CHANNEL_SECRET is not set");
  }
  return secret;
}

export function getLineChannelAccessToken(): string {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    throw new Error("LINE_CHANNEL_ACCESS_TOKEN is not set");
  }
  return token;
}

export function getLineLoginChannelId(): string {
  const id = process.env.LINE_LOGIN_CHANNEL_ID;
  if (!id) {
    throw new Error("LINE_LOGIN_CHANNEL_ID is not set");
  }
  return id;
}

export function getLiffId(): string {
  const id = process.env.NEXT_PUBLIC_LINE_LIFF_ID ?? process.env.LINE_LIFF_ID;
  if (!id) {
    throw new Error("NEXT_PUBLIC_LINE_LIFF_ID is not set");
  }
  return id;
}

export function getAdminLineUserIds(): string[] {
  return (process.env.ADMIN_LINE_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => /^U[0-9a-f]{32}$/i.test(id));
}

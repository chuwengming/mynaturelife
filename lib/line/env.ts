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

import crypto from "crypto";

type StatePayload = {
  uid: string;
  nonce: string;
  iat: number;
};

function b64url(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

export function signState(payload: StatePayload, secret: string): string {
  const body = b64url(JSON.stringify(payload));
  const sig = b64url(crypto.createHmac("sha256", secret).update(body).digest());
  return `${body}.${sig}`;
}

export function verifyState(state: string, secret: string): StatePayload | null {
  const [body, sig] = state.split(".");
  if (!body || !sig) return null;

  const expected = b64url(crypto.createHmac("sha256", secret).update(body).digest());
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;

  const json = Buffer.from(body.replaceAll("-", "+").replaceAll("_", "/"), "base64").toString("utf8");
  const parsed = JSON.parse(json) as StatePayload;

  if (!parsed?.uid || !parsed?.nonce || !parsed?.iat) return null;
  return parsed;
}
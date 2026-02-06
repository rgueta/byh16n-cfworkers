import { sign } from "hono/jwt";

export async function createJWT(payload, secret, expSeconds = 86400) {
  return sign(
    {
      ...payload,
      exp: Math.floor(Date.now() / 1000) + expSeconds,
    },
    secret,
  );
}

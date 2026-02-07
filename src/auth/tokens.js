import { sign } from "hono/jwt";
import { sha256, randomToken } from "./pwd";

export async function createAccessToken(c, user) {
  console.log("secret:", c.env.JWT_SECRET);
  return sign(
    {
      sub: String(user.id),
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + 60 * 2, // 2 min
    },
    c.env.JWT_SECRET,
    "HS256",
  );
}

export async function createRefreshToken(userId, kv, ttlDays = 14) {
  const raw = randomToken();
  const hash = await sha256(raw);

  await kv.put(`refresh:${hash}`, String(userId), {
    expirationTtl: 60 * 5, // 5 min.
    // expirationTtl: ttlDays * 24 * 60 * 60,
  });

  return raw;
}

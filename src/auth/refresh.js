import { sha256 } from "./auth/pwd";
import { createAccessToken } from "./auth/tokens";

app.post("/auth/refresh", async (c) => {
  const { refreshToken } = await c.req.json();
  if (!refreshToken) {
    return c.json({ error: "No refresh token" }, 400);
  }

  const hash = await sha256(refreshToken);
  const userId = await c.env.REFRESH_KV.get(`refresh:${hash}`);

  if (!userId) {
    return c.json({ error: "Invalid refresh token" }, 401);
  }

  const user = await c.env.DB.prepare(
    `SELECT id, role FROM users WHERE id = ? AND active = 1`,
  )
    .bind(userId)
    .first();

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  const newAccessToken = await createAccessToken(user, c.env.JWT_SECRET);

  return c.json({ accessToken: newAccessToken });
});

import { Hono } from "hono";
import { sign } from "hono/jwt";

export const authRoutes = new Hono();

authRoutes.post("/login", async (c) => {
  const { email, password } = await c.req.json();

  // 🔒 Validación simulada
  if (email !== "admin@test.com" || password !== "1234") {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const token = await sign({ email, role: "admin" }, c.env.JWT_SECRET, {
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
  });

  return c.json({ token });
});

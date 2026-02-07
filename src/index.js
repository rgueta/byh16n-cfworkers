import { Hono } from "hono";
import { corsMiddleware } from "./middleware/cors.js";
import importar from "./routes/importar.js";
import users from "./routes/users.js";

// ----  JWT  -----
import { authMiddleware } from "./auth/middleware.js";
import { hashPwd, verifyPwd, sha256 } from "./auth/pwd.js";
import { createAccessToken, createRefreshToken } from "./auth/tokens.js";

//-------- DB ----------

const app = new Hono();

app.post("/auth/login", async (c) => {
  const { email, pwd } = await c.req.json();

  const user = await c.env.DB.prepare(
    `
    SELECT
      u.id,
      u.username,
      u.email,
      u.pwd,
      GROUP_CONCAT(r.name, ', ') as role,
      COUNT(r.id) as qtyRoles
  FROM users u
  LEFT JOIN userRoles ur ON u.id = ur.userId
  LEFT JOIN roles r ON ur.roleId = r.id
  WHERE email = ?
  GROUP BY u.id, u.username, u.email
  ORDER BY u.username`,
  )
    .bind(email)
    .first();

  if (!user) return c.json({ error: "Invalid credentials" }, 401);

  const valid = await verifyPwd(pwd, email.toLowerCase(), user.pwd);

  if (!valid) return c.json({ error: "Invalid credentials" }, 401);

  const accessToken = await createAccessToken(c, user);

  const refreshToken = await createRefreshToken(user.id, c.env.REFRESH_KV);

  return c.json({ accessToken: accessToken, refreshToken: refreshToken });
});

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
    `
      SELECT
      u.id,
      GROUP_CONCAT(r.name, ', ') as role,
      COUNT(r.id) as qtyRoles
      FROM users u
      LEFT JOIN userRoles ur ON u.id = ur.userId
      LEFT JOIN roles r ON ur.roleId = r.id
      WHERE id = ? AND locked = 0
      GROUP BY u.id, u.username, u.email
      `,
  )
    .bind(userId)
    .first();

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  const newAccessToken = await createAccessToken(user, c.env.JWT_SECRET);

  return c.json({ accessToken: newAccessToken });
});

app.post("/auth/logout", async (c) => {
  const { refreshToken } = await c.req.json();
  if (!refreshToken) return c.json({ ok: true });

  const hash = await sha256(refreshToken);
  await c.env.REFRESH_KV.delete(`refresh:${hash}`);

  return c.json({ ok: true });
});

app.get("/me", authMiddleware(), async (c) => {
  return c.json(c.get("jwtPayload"));
});

// Falta completar la informacion completa para la tabla
// de usuarios
app.post("/auth/register", async (c) => {
  const { email, password } = await c.req.json();
  const hash = await hashPwd(password, email.toLowerCase());

  await c.env.DB.prepare(
    `
      INSERT INTO users (email, password_hash)
      VALUES (?, ?)
    `,
  )
    .bind(email, hash)
    .run();

  return c.json({ ok: true });
});

app.post("/pwd/show", async (c) => {
  const { email, pwd } = await c.req.json();
  const hash = await hashPwd(pwd, email.toLowerCase());
  console.log("pwd: ", hash);
  return c.json({ ok: true, pwd: hash });
});

app.get("/", (c) => c.text("OK"));

app.route("/api/users", users);
app.route("/api/importar", importar);

app.get("/debug/env", (c) => {
  return c.json({
    message: "env ok",
    env: c.env,
  });
});

export default {
  fetch(request, env, ctx) {
    return app.fetch(request, env, ctx);
  },
};

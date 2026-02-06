import { Hono } from "hono";
import { corsMiddleware } from "./middleware/cors.js";
import importar from "./routes/importar.js";
import users from "./routes/users.js";

// ----  JWT  -----
import { createJWT } from "./auth/jwt.js";
import { authMiddleware } from "./auth/middleware.js";
import { hashPwd, verifyPwd } from "./auth/pwd.js";
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

  const token = await createJWT(
    { sub: String(user.id), role: user.role },
    c.env.JWT_SECRET,
  );

  return c.json({ token });
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

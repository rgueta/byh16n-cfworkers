import { Hono } from "hono";
import { corsMiddleware } from "./middleware/cors.js";
import importarRoutes from "./routes/importar.js";
import usersRoutes from "./routes/users.js";
import codeEventsRoutes from "./routes/codeEvents.js";
import codeRoutes from "./routes/codes.js";
import coresRoutes from "./routes/cores.js";
import roleRoutes from "./routes/roles.js";
import cpusRoutes from "./routes/cpus.js";
import pwdRstRoutes from "./routes/pwdRST.js";

// ----  JWT  -----
import { hashPwd, verifyPwd, sha256 } from "./auth/pwd.js";

import { verifyToken, verifyRoleLevel } from "./auth/auth.js";
import { auth as authRoutes } from "./routes/auth.js";

//-------- DB ----------

const app = new Hono();
app.use("*", corsMiddleware);
app.options("*", (c) => c.text("", 204));

app.get("/api/config", async (c) => {
  const result = await c.env.DB.prepare(
    `
    SELECT c.debug,c.send_sms, c.backendUrl, c.localUrl,c.serverUrl,
      json_group_array(ai.device_uuid) as admin_device,
      json_group_array(ai.sim) as admin_sim,
      json_group_array(ai.email) as admin_email
    FROM configApp c
    LEFT JOIN configApp_adminInfo ca ON c.id = ca.configAppId
    LEFT JOIN admin_info ai ON ai.id = ca.adminInfoId
    GROUP BY c.id
    `,
  ).all();

  // const admin_device = result.admin_device
  //   ? JSON.parse(result.admin_device)
  //   : [];
  // result.admin_device = admin_device;

  // Transformar los resultados: parsear roles de string a array
  const config = result.results.map((item) => ({
    ...item,
    admin_device: JSON.parse(item.admin_device),
    admin_sim: JSON.parse(item.admin_sim),
    admin_email: JSON.parse(item.admin_email),
  }));

  // const admin_sim = result.admin_sim ? JSON.parse(result.admin_sim) : [];
  // result.admin_sim = admin_sim;

  // const admin_email = result.admin_email ? JSON.parse(result.admin_email) : [];
  // result.admin_email = admin_email;

  return c.json(config);
});

app.get(
  "/api/me/:userId",
  verifyToken(),
  verifyRoleLevel("neighborAdmin"),
  async (c) => {
    const userId = c.req.param("userId");
    const user = await c.env.DB.prepare(
      `SELECT
            u.id,
            u.name,
            u.email,
            u.sim,
            u.location,
            u.locked,
            c.id as coreId,
            c.name as coreName,
            c.Sim as coreSim,
            c.shortName as coreShortName,
            cpu.shortName as cpu,
            country.shortName as country,
            state.name as state,
            city.shortName as city,
            d.id as divisionId,
            json_group_array(
              json_object(
                'id', r.id,
                'name', r.name,
                'shortName', r.shortName,
                'level', r.level
              )
            ) as roles
          FROM users u
          INNER JOIN cores c ON u.coreId = c.id
          INNER JOIN cpus cpu ON c.cpuId = cpu.id
          INNER JOIN divisions d ON d.id = cpu.divisionId
          INNER JOIN cities city ON city.id = d.cityId
          INNER JOIN states state ON state.id = city.stateId
          INNER JOIN countries country ON state.countryId = country.id
          LEFT JOIN userRoles ur ON u.id = ur.userId
          LEFT JOIN roles r ON ur.roleId = r.id
          WHERE u.id = ? AND u.locked = 0
          GROUP BY u.id
      `,
    )
      .bind(userId)
      .first();

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    // Parsear roles si existen
    const roles = user.roles ? JSON.parse(user.roles) : [];

    // No enviar información sensible
    const { ...userData } = user;
    userData.roles = roles;

    return c.json(userData);
  },
);

// app.get("/api/me", verifyToken(), async (c) => {
//   return c.json(c.get("jwtPayload"));
// });

// Falta completar la informacion completa para la tabla
// de usuarios
app.post("/api/register", async (c) => {
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

app.post("/api/show", async (c) => {
  const { email, pwd } = await c.req.json();
  const hash = await hashPwd(pwd, email.toLowerCase());
  console.log("pwd: ", hash);
  return c.json({ ok: true, pwd: hash });
});

app.get("/", (c) => c.text("OK"));

app.post("/api/logout", async (c) => {
  const { refreshToken } = await c.req.json();
  if (!refreshToken) return c.json({ ok: true });

  const hash = await sha256(refreshToken);
  await c.env.REFRESH_KV.delete(`refresh:${hash}`);

  return c.json({ ok: true });
});

app.route("/api/auth", authRoutes);
app.route("/api/users", usersRoutes);
app.route("/api/importar", importarRoutes);
app.route("/api/codeEvent", codeEventsRoutes);
app.route("/api/cpus", cpusRoutes);
app.route("/api/cores", coresRoutes);
app.route("/api/codes", codeRoutes);
app.route("/api/roles", roleRoutes);
app.route("/api/pwdReset", pwdRstRoutes);

app.get("/api/env", (c) => {
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

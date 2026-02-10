import { Hono } from "hono";
import { corsMiddleware } from "./middleware/cors.js";
import importar from "./routes/importar.js";
import users from "./routes/users.js";

// ----  JWT  -----
import { hashPwd, verifyPwd, sha256 } from "./auth/pwd.js";
import {
  createAccessToken,
  createRefreshToken,
  verifyToken,
} from "./auth/tokens.js";

//-------- DB ----------

const app = new Hono();
app.use("*", corsMiddleware);
app.options("*", (c) => c.text("", 204));

app.post("/auth/signin", async (c) => {
  const { email, pwd } = await c.req.json();

  const user = await c.env.DB.prepare(
    `
    SELECT
        u.id,
        u.name,
        u.pwd,
        u.sim,
        u.email,
        u.location,
        c.id as core,
        u.locked,
        c.name AS coreName,
        c.Sim AS coreSim,
        c.shortName AS coreShortName,
        c.code_expire,
        c.remote,
        cpu.shortName AS cpu,
        country.shortName AS country,
        state.name,
        city.shortName AS city,
        d.id AS div,
        conf.backendUrl,
        conf.localUrl,
        json_group_array(
               json_object(
                   'id', r.id,
                   'name', r.name,
                   'shortName', r.shortName,
                   'level', r.level
                )
           ) as roles,
        COUNT(r.id) as qtyRoles
    FROM users u
    -- Join con cores
    INNER JOIN cores c ON u.coreId = c.id
    -- Join con CPUs
    INNER JOIN cpus cpu ON c.cpuId = cpu.id
    -- Join con divisions
    INNER JOIN divisions d ON d.id = cpu.divisionId
    -- Join con cities
    INNER JOIN cities city ON city.id = d.cityId
    -- Join con states
    INNER JOIN states state ON state.id = city.stateId
    -- Join con countries
    INNER JOIN countries country ON state.countryId = country.id
    -- Join con configApp (con ID específico)
    INNER JOIN configApp conf ON conf.id = 1
    -- Left join con roles para mantener usuarios sin roles
     LEFT JOIN userRoles ur ON u.id = ur.userId
     LEFT JOIN roles r ON ur.roleId = r.id
    WHERE u.email = ?
    GROUP BY u.id, u.username, u.email`,
  )
    .bind(email)
    .first();

  if (!user) return c.json({ error: "Invalid credentials" }, 401);

  const valid = await verifyPwd(pwd, email.toLowerCase(), user.pwd);

  if (!valid) return c.json({ error: "Invalid credentials" }, 401);

  const accessToken = await createAccessToken(c, user);

  const refreshToken = await createRefreshToken(c, user.id, user.role);

  const decode = decodeJwt(accessToken);

  // Fechas CORRECTAS
  const expDate = new Date(decode.exp * 1000);
  const iatDate = new Date(decode.iat * 1000);

  const jsonRoles = user.roles ? JSON.parse(user.roles) : [];

  return c.json({
    authToken: accessToken,
    refreshToken: refreshToken,
    userId: user.id,
    userName: user.name,
    roles: jsonRoles,
    sim: user.sim,
    coreSim: user.coreSim,
    pwd: user.pwd,
    locked: user.locked,
    coreId: user.core,
    coreName: user.coreName,
    email: user.email,
    location: user.location,
    backendUrl: user.backendUrl,
    localUrl: user.localUrl,
    code_expiry: user.code_expire,
    iatDate: iatDate.toLocaleString(),
    expDate: expDate.toLocaleString(),
    remote: user.remote,
  });
});

app.get("/api/config", async (c) => {
  const result = await c.env.DB.prepare(
    `
    SELECT c.debug,c.send_sms, c.backendUrl, c.localUrl,c.serverUrl,
      json_group_array(ai.device_uuid) as admin_device,
      json_group_array(
             json_object(
                 'name', ai.name,
                 'sim', ai.sim
              )
         ) as admin_sim,
         json_group_array(
                json_object(
                    'id', ai.id,
                    'name', ai.name,
                    'email', ai.email
                 )
            ) as admin_email
    FROM configApp c
    LEFT JOIN configApp_adminInfo ca ON c.id = ca.configAppId
    LEFT JOIN admin_info ai ON ai.id = ca.adminInfoId
    GROUP BY c.id
    `,
  ).first();

  const admin_device = result.admin_device
    ? JSON.parse(result.admin_device)
    : [];
  result.admin_device = admin_device;

  const admin_sim = result.admin_sim ? JSON.parse(result.admin_sim) : [];
  result.admin_sim = admin_sim;

  const admin_email = result.admin_email ? JSON.parse(result.admin_email) : [];
  result.admin_email = admin_email;

  return c.json(result);
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

app.get("/me", verifyToken(), async (c) => {
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

const decodeJwt = (token) => {
  const [, payload] = token.split(".");
  return JSON.parse(atob(payload));
};

import { Hono } from "hono";
import { corsMiddleware } from "./middleware/cors.js";
import importarRoutes from "./routes/importar.js";
import usersRoutes from "./routes/users.js";
import codeEventsRoutes from "./routes/codeEvents.js";
import codeRoutes from "./routes/codes.js";
import coresRoutes from "./routes/cores.js";

// ----  JWT  -----
import { hashPwd, verifyPwd, sha256 } from "./auth/pwd.js";

import { verifyToken, verifyRole } from "./auth/auth.js";
import { auth as authRoutes } from "./routes/auth.js";
// import { autoRefresh } from "./auth/autoRefresh.js";

//-------- DB ----------

const app = new Hono();
app.use("*", corsMiddleware);
app.options("*", (c) => c.text("", 204));
// app.use("/api/*", autoRefresh(app));

// app.post("/signin", async (c) => {
//   const { email, pwd } = await c.req.json();

//   const user = await c.env.DB.prepare(
//     `
//     SELECT
//         u.id,
//         u.name,
//         u.pwd,
//         u.sim,
//         u.email,
//         u.location,
//         c.id as core,
//         u.locked,
//         c.name AS coreName,
//         c.Sim AS coreSim,
//         c.shortName AS coreShortName,
//         c.code_expire,
//         c.remote,
//         cpu.shortName AS cpu,
//         country.shortName AS country,
//         state.name,
//         city.shortName AS city,
//         d.id AS div,
//         conf.backendUrl,
//         conf.localUrl,
//         json_group_array(
//                json_object(
//                    'id', r.id,
//                    'name', r.name,
//                    'shortName', r.shortName,
//                    'level', r.level
//                 )
//            ) as roles,
//         COUNT(r.id) as qtyRoles
//     FROM users u
//     -- Join con cores
//     INNER JOIN cores c ON u.coreId = c.id
//     -- Join con CPUs
//     INNER JOIN cpus cpu ON c.cpuId = cpu.id
//     -- Join con divisions
//     INNER JOIN divisions d ON d.id = cpu.divisionId
//     -- Join con cities
//     INNER JOIN cities city ON city.id = d.cityId
//     -- Join con states
//     INNER JOIN states state ON state.id = city.stateId
//     -- Join con countries
//     INNER JOIN countries country ON state.countryId = country.id
//     -- Join con configApp (con ID específico)
//     INNER JOIN configApp conf ON conf.id = 1
//     -- Left join con roles para mantener usuarios sin roles
//      LEFT JOIN userRoles ur ON u.id = ur.userId
//      LEFT JOIN roles r ON ur.roleId = r.id
//     WHERE u.email = ?
//     GROUP BY u.id, u.username, u.email`,
//   )
//     .bind(email)
//     .first();

//   if (!user) return c.json({ error: "Invalid credentials" }, 401);

//   const valid = await verifyPwd(pwd, email.toLowerCase(), user.pwd);

//   if (!valid) return c.json({ error: "Invalid credentials" }, 401);

//   const jsonRoles = user.roles ? JSON.parse(user.roles) : [];
//   const primaryRole = jsonRoles.length > 0 ? jsonRoles[0].name : "";

//   // Crear objeto user con el rol
//   const userForToken = {
//     id: user.id,
//     role: primaryRole,
//     ...user,
//   };

//   const accessToken = await createAccessToken(c, userForToken);
//   const refreshToken = await createRefreshToken(c, user.id, primaryRole);
//   const decode = decodeJwt(accessToken);

//   // Fechas CORRECTAS
//   const expDate = new Date(decode.exp * 1000);
//   const iatDate = new Date(decode.iat * 1000);

//   return c.json({
//     authToken: accessToken,
//     refreshToken: refreshToken,
//     userId: user.id,
//     userName: user.name,
//     roles: jsonRoles,
//     sim: user.sim,
//     coreSim: user.coreSim,
//     pwd: user.pwd,
//     locked: user.locked,
//     coreId: user.core,
//     coreName: user.coreName,
//     email: user.email,
//     location: user.location,
//     backendUrl: user.backendUrl,
//     localUrl: user.localUrl,
//     code_expiry: user.code_expire,
//     iatDate: iatDate.toLocaleString(),
//     expDate: expDate.toLocaleString(),
//     remote: user.remote,
//   });
// });

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

app.get(
  "/api/me/:userId",
  verifyToken(),
  verifyRole(["admin", "neighborAdmin"]),
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

app.route("/api/auth", authRoutes);
app.route("/api/users", usersRoutes);
app.route("/api/importar", importarRoutes);
app.route("/api/codeEvent", codeEventsRoutes);
app.route("/api/cores", coresRoutes);

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

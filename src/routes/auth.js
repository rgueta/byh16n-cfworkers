import { Hono } from "hono";
import { sign, verify } from "hono/jwt";
import { verifyPwd, sha256 } from "../auth/pwd.js";
import { createAccessToken, createRefreshToken } from "../auth/tokens.js";
import { autoRefresh } from "../auth/autoRefresh.js";
import { verifyToken as verifyJwt } from "../auth/auth.js";

export const auth = new Hono();
// Valores por defecto desde environment
const getDefaults = (c) => ({
  accessTokenExpiry: parseInt(c.env.ACCESS_TOKEN_EXPIRY) || 2 * 60,
  refreshTokenExpiry: parseInt(c.env.REFRESH_TOKEN_EXPIRY) || 14 * 24 * 60 * 60,
});

auth.post("/signin", async (c) => {
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

  const jsonRoles = user.roles ? JSON.parse(user.roles) : [];
  const primaryRole = jsonRoles.length > 0 ? jsonRoles[0].name : "";

  // Crear objeto user con el rol
  const userForToken = {
    id: user.id,
    role: primaryRole,
    ...user,
  };

  const accessToken = await createAccessToken(c, userForToken);
  const refreshToken = await createRefreshToken(c, user.id, primaryRole);
  const decode = decodeJwt(accessToken);

  // Fechas CORRECTAS
  const expDate = new Date(decode.exp * 1000);
  const iatDate = new Date(decode.iat * 1000);

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

auth.post("/refresh", async (c) => {
  const defaults = getDefaults(c);
  const { refreshToken } = await c.req.json();
  const hash = await sha256(refreshToken);

  const refreshData = await c.env.REFRESH_KV.get(`refresh:${hash}`);

  if (!refreshToken) {
    return c.json({ error: "No refresh token" }, 401);
  }

  // Parsear los datos guardados
  const { userId } = JSON.parse(refreshData);

  const user = await c.env.DB.prepare(
    `
      SELECT
      u.id,
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
      LEFT JOIN userRoles ur ON u.id = ur.userId
      LEFT JOIN roles r ON ur.roleId = r.id
      WHERE u.id = ? AND locked = 0
      GROUP BY u.id, u.username, u.email
      `,
  )
    .bind(userId)
    .first();

  let payload;
  const jsonRoles = user.roles ? JSON.parse(user.roles) : [];
  const primaryRole = jsonRoles.length > 0 ? jsonRoles[0].name : "";
  // Crear objeto user con el rol
  const userForToken = {
    id: user.id,
    role: primaryRole,
    ...user,
  };

  try {
    payload = await verify(refreshToken.trim(), c.env.JWT_SECRET, "HS256");
  } catch (err) {
    return c.json({ msg: "Invalid refresh token", error: err }, 403);
  }

  const key = `refresh:${payload.sub}`;
  const stored = await c.env.REFRESH_KV.get(`refresh:${hash}`, "json");

  // const stored = await autoRefresh(c.env, payload.sub);

  if (!stored) {
    return c.json({ error: "Refresh token revoked" }, 403);
  }

  let iatDate = Math.floor(Date.now() / 1000);
  let expDate = Math.floor(Date.now() / 1000) + defaults.accessTokenExpiry;

  const newAccessToken = await sign(
    {
      sub: String(user.id),
      role: primaryRole || "",
      iat: iatDate,
      exp: expDate,
    },
    c.env.JWT_SECRET,
    "HS256",
  );

  return c.json(
    {
      success: true,
      authToken: newAccessToken,
      iatDate: new Date(iatDate * 1000).toLocaleString(),
      expDate: new Date(expDate * 1000).toLocaleString(),
    },
    200,
  );
});

const decodeJwt = (token) => {
  const [, payload] = token.split(".");
  return JSON.parse(atob(payload));
};

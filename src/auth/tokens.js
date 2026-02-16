import { sign } from "hono/jwt";
import { sha256, randomToken } from "./pwd.js";

// Valores por defecto desde environment
const getDefaults = (c) => ({
  accessTokenExpiry: parseInt(c.env.ACCESS_TOKEN_EXPIRY) || 2 * 60,
  refreshTokenExpiry: parseInt(c.env.REFRESH_TOKEN_EXPIRY) || 14 * 24 * 60 * 60,
});

export async function createAccessToken(c, user, customExpiry = null) {
  const defaults = getDefaults(c);
  const expiresInSeconds = customExpiry ?? defaults.accessTokenExpiry;

  const userRole =
    user.role ||
    (user.roles && user.roles.length > 0 ? user.roles[0].name : "") ||
    "";

  return sign(
    {
      sub: String(user.id),
      role: userRole || "",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
    },
    c.env.JWT_SECRET,
    "HS256",
  );
}

export async function createRefreshToken(c, userId, userRole = "") {
  const defaults = getDefaults(c);
  // Generar un JWT refresh token
  const refreshJwt = await sign(
    {
      sub: String(userId),
      role: userRole || "",
      type: "refresh", // Tipo de token
      jti: randomToken(16), // ID único del token (JWT ID)
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + defaults.refreshTokenExpiry,
    },
    c.env.JWT_SECRET,
    "HS256",
  );

  // Hashear el token para guardar en KV (mejor seguridad)
  const hash = await sha256(refreshJwt);

  // Guardar en KV con metadata adicional si necesitas
  await c.env.REFRESH_KV.put(
    `refresh:${hash}`,
    JSON.stringify({
      userId: String(userId),
      userRole: userRole,
      issuedAt: Date.now(),
      expiresAt: Math.floor(Date.now() / 1000) + defaults.refreshTokenExpiry,
      // Puedes agregar más metadata como IP, user agent, etc.
    }),
    {
      expirationTtl: defaults.refreshTokenExpiry,
    },
  );

  return refreshJwt; // Devolver el JWT
}

export async function getRefreshToken(env, userId) {
  return env.REFRESH_KV.get(`refresh:${userId}`);
}

export async function deleteRefreshToken(env, userId) {
  await env.REFRESH_KV.delete(`refresh:${userId}`);
}

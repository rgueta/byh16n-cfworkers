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

export async function createRefreshToken(c, userId, userRole = "", deviceId) {
  const defaults = getDefaults(c);

  if (!deviceId) {
    throw new Error("deviceId es obligatorio para multi-device");
  }

  const refreshJwt = await sign(
    {
      sub: String(userId),
      role: userRole,
      type: "refresh",
      jti: randomToken(16),
      deviceId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + defaults.refreshTokenExpiry,
    },
    c.env.JWT_SECRET,
    "HS256",
  );

  const hash = await sha256(refreshJwt);

  const key = `refresh:${userId}:${deviceId}`;

  const value = JSON.stringify({
    hash,
    userId: String(userId),
    role: userRole,
    deviceId,
    issuedAt: Date.now(),
    expiresAt: Math.floor(Date.now() / 1000) + defaults.refreshTokenExpiry,
  });

  await c.env.REFRESH_KV.put(key, value, {
    expirationTtl: defaults.refreshTokenExpiry,
  });

  return refreshJwt;
}

export async function verifyRefreshToken(c, refreshToken, deviceId) {
  const payload = await verify(refreshToken, c.env.JWT_SECRET, "HS256");

  if (payload.type !== "refresh") {
    throw new Error("No es refresh token");
  }

  const key = `refresh:${payload.sub}:${deviceId}`;
  const stored = await c.env.REFRESH_KV.get(key, "json");

  if (!stored) {
    throw new Error("Refresh token no existe (revocado)");
  }

  const incomingHash = await sha256(refreshToken);

  if (stored.hash !== incomingHash) {
    throw new Error("Refresh token inválido");
  }

  return payload;
}

export async function createRefreshToken__DeepSeek(c, userId, userRole = "") {
  const defaults = getDefaults(c);

  // Verificar que REFRESH_KV existe
  console.log("REFRESH_KV existe:", !!c.env.REFRESH_KV);

  const refreshJwt = await sign(
    {
      sub: String(userId),
      role: userRole || "",
      type: "refresh",
      jti: randomToken(16),
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + defaults.refreshTokenExpiry,
    },
    c.env.JWT_SECRET,
    "HS256",
  );

  const hash = await sha256(refreshJwt);
  const key = `refresh:${hash}`;

  console.log("Key a guardar:", key);
  console.log("Expiration TTL:", defaults.refreshTokenExpiry);

  try {
    // Verificar que podemos leer el KV antes de escribir
    const test = await c.env.REFRESH_KV.get("test-key");
    console.log("KV accesible, test read:", test);

    const valueToStore = JSON.stringify({
      userId: String(userId),
      userRole: userRole,
      issuedAt: Date.now(),
      expiresAt: Math.floor(Date.now() / 1000) + defaults.refreshTokenExpiry,
    });

    console.log("Valor a guardar (tamaño):", valueToStore.length, "bytes");

    await c.env.REFRESH_KV.put(key, valueToStore, {
      expirationTtl: defaults.refreshTokenExpiry,
    });

    // Verificar que se guardó correctamente
    const saved = await c.env.REFRESH_KV.get(key);
    console.log("Verificación - dato guardado:", saved ? "SÍ" : "NO");
  } catch (err) {
    console.error("Error detallado:", {
      error: err,
      message: err.message,
      stack: err.stack,
      name: err.name,
    });

    return c.json(
      {
        error: err.message,
        msg: "error al grabar refreshToken en KV NAMESPACES",
      },
      401,
    );
  }

  return refreshJwt;
}

export async function createRefreshToken_Original(c, userId, userRole = "") {
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

  try {
    console.log("Estoy en Guardar KV refreshJwt:", refreshJwt);
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
  } catch (err) {
    return c.json(
      { error: err, msg: "error al grabar refreshToken en KV NAMESPACES" },
      401,
    );
  }

  return refreshJwt; // Devolver el JWT
}

export async function getRefreshToken(env, userId) {
  return env.REFRESH_KV.get(`refresh:${userId}`);
}

export async function deleteRefreshToken(env, userId) {
  await env.REFRESH_KV.delete(`refresh:${userId}`);
}

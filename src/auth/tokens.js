import { sign, jwt, verify } from "hono/jwt";
import { sha256, randomToken } from "./pwd.js";

export async function createAccessToken(c, user) {
  return sign(
    {
      sub: String(user.id),
      role: user.role || "",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 2, // 2 min
    },
    c.env.JWT_SECRET,
    "HS256",
  );
}

export async function createRefreshToken(c, userId, userRole = "") {
  // Generar un JWT refresh token
  const refreshJwt = await sign(
    {
      sub: String(userId),
      role: userRole || "",
      type: "refresh", // Tipo de token
      jti: randomToken(16), // ID único del token (JWT ID)
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60, // 14 días
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
      issuedAt: Date.now(),
      expiresAt: Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60,
      // Puedes agregar más metadata como IP, user agent, etc.
    }),
    {
      expirationTtl: 14 * 24 * 60 * 60, // 14 días
    },
  );

  return refreshJwt; // Devolver el JWT
}

export const verifyToken = () => {
  return async (c, next) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ error: "No token provided" }, 401);
    }

    const token = authHeader.split(" ")[1];

    try {
      // Verificar el token
      const payload = await verify(token, c.env.JWT_SECRET, "HS256");
      c.set("jwtPayload", payload);
      c.set("userId", payload.sub);
      return await next();
    } catch (error) {
      // Si el token expiró, devolver 401 específico
      if (error.message.includes("expired")) {
        return c.json({ error: "Token expired", code: "TOKEN_EXPIRED" }, 401);
      }
      return c.json({ error: "Invalid token" }, 401);
    }
  };
};

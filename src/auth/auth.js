import { verify } from "hono/jwt";

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
      c.set("userRole", payload.role || "");

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

export const verifyRole = (rolesPermitidos = []) => {
  return async (c, next) => {
    const userRole = c.get("userRole");
    if (!userRole) {
      return c.json({ error: "No role found in token" }, 403);
    }

    // Verificar si el rol está en los permitidos
    const tieneRol = rolesPermitidos.includes(userRole);

    if (!tieneRol) {
      return c.json(
        {
          error: "No tienes permisos para esta acción",
          requiredRoles: rolesPermitidos,
          userRole: userRole,
        },
        403,
      );
    }

    await next();
  };
};

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
        console.log("El accessToken expiro...");
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

export const verifyRoleLevel = (role) => {
  return async (c, next) => {
    const userRole = c.get("userRole");
    const userId = c.get("userId");

    const roleLeve = await getRoleLevel(c.env.DB, role);

    const userRoleLeve = await getUserRoleLevel(c.env.DB, userId);

    if (roleLeve.level > userRoleLeve.level) {
      return c.json(
        {
          error: "No tienes permisos para esta acción",
          userRole: userRole,
        },
        403,
      );
    }

    await next();
  };
};

const getUserRoleLevel = async (db, userId) => {
  try {
    const query = `
      SELECT
        r.name as roleName,
        r.level as roleLevel
      FROM userRoles ur
      JOIN roles r ON ur.roleId = r.id
      WHERE ur.userId = ?
      ORDER BY r.level DESC
      LIMIT 1
    `;

    const result = await db.prepare(query).bind(userId).first();

    if (!result) {
      return { level: 0, role: "none" }; // Nivel 0 para usuarios sin rol
    }

    return {
      level: result.roleLevel,
      role: result.roleName,
    };
  } catch (error) {
    console.error("Error obteniendo nivel de usuario:", error);
    throw error;
  }
};

const getRoleLevel = async (db, role) => {
  try {
    const query = `
      SELECT *
      FROM roles
      WHERE name = ?
      ORDER BY level DESC
      LIMIT 1
    `;

    const result = await db.prepare(query).bind(role).first();

    if (!result) {
      console.log("No encontre datos del filtro");
      return { level: 0, role: "none" }; // Nivel 0 para usuarios sin rol
    }

    return {
      level: result.level,
      role: result.name,
      roleId: result.id,
    };
  } catch (error) {
    console.error("Error obteniendo nivel de role:", error);
    return { level: 0, role: "none", error: error.message };
  }
};

// Verificar si usuario tiene acceso a un recurso por nivel
export async function checkUserAccess(db, userId, requiredLevel) {
  const userLevel = await getUserRoleLevel(db, userId);
  return userLevel.level >= requiredLevel;
}

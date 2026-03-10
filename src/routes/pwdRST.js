import { Hono } from "hono";
import { verifyToken, verifyRoleLevel } from "../auth/auth.js";

const pwdRstRoutes = new Hono();

pwdRstRoutes.post("/pwdRST/:email", async (c) => {
  const email = c.req.param("email");
  const devicePkg = await c.req.json();

  console.log("devicePkg: ", devicePkg);

  // Respuesta exitosa
  return c.json(
    {
      success: true,
      correo: email,
      message: "Usuario creado y roles asignados exitosamente",
    },
    201,
  );
});

pwdRstRoutes.post("/pwdRST_/:email", async (c) => {
  try {
    const userId = c.req.param("userId");
    const pkg = await c.req.json();

    // Extraer roles explícitamente del pkg
    const { roles: rolesFromPkg, ...userData } = pkg;

    // Asegurar que roles sea un array plano
    let roles = [];
    if (rolesFromPkg) {
      if (Array.isArray(rolesFromPkg)) {
        roles = rolesFromPkg.flat(); // Convierte [[4]] en [4]
      }
    }

    // Definir el orden exacto de las columnas
    const columnOrder = [
      "email",
      "username",
      "pwd",
      "name",
      "house",
      "sim",
      "gender",
      "avatar",
      "coreId",
      "location",
      "locked",
      "uuid",
      "blocked",
    ];

    // Construir la consulta de usuario
    const values = columnOrder.map((col) =>
      userData[col] !== undefined ? userData[col] : null,
    );

    const qry = `INSERT INTO users (${columnOrder.join(", ")})
                   VALUES (${columnOrder.map(() => "?").join(", ")})`;

    // Primero insertar el usuario
    const result = await c.env.DB.prepare(qry)
      .bind(...values)
      .run();

    if (!result.success) {
      throw new Error("Error al insertar usuario");
    }

    // Obtener el ID del usuario insertado
    const userIdQuery = await c.env.DB.prepare(
      "SELECT last_insert_rowid() as id",
    ).first();

    if (!userIdQuery) {
      throw new Error("No se pudo obtener el ID del usuario");
    }

    const newUserId = userIdQuery.id;

    // Insertar roles (si hay)
    if (roles.length > 0) {
      // Usar batch para insertar todos los roles en una sola operación
      const roleStatements = roles.map((roleId) => {
        const roleIdNum = parseInt(roleId);
        if (isNaN(roleIdNum)) {
          throw new Error(`RoleId inválido: ${roleId}`);
        }
        return c.env.DB.prepare(
          "INSERT INTO userRoles (userId, roleId, assignedBy, expiresAt) VALUES (?, ?, ?, ?)",
        ).bind(newUserId, roleIdNum, userId, null);
      });

      const roleResults = await c.env.DB.batch(roleStatements);

      // Verificar que todos los roles se insertaron correctamente
      const allRolesSuccess = roleResults.every((r) => r.success);
      if (!allRolesSuccess) {
        throw new Error("Error al asignar algunos roles");
      }
    }

    // Respuesta exitosa
    return c.json(
      {
        success: true,
        userId: newUserId,
        assignedRoles: roles,
        message: "Usuario creado y roles asignados exitosamente",
      },
      201,
    );
  } catch (error) {
    console.error("Error:", error);

    // NO hacer ROLLBACK explícito - D1 lo maneja automáticamente

    // Determinar código HTTP apropiado
    let statusCode = 400;
    let errorMessage = error.message;

    if (error.message.includes("UNIQUE constraint")) {
      statusCode = 409;
      errorMessage = "El email o username ya está registrado";
    }

    return c.json(
      {
        success: false,
        error: errorMessage,
        details: error.message,
      },
      statusCode,
    );
  }
});

export default pwdRstRoutes;

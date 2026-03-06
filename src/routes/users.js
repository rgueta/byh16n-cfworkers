import { Hono } from "hono";
import { verifyToken, verifyRoleLevel } from "../auth/auth.js";

const usersRoutes = new Hono();

usersRoutes.get("/:email", async (c) => {
  const email = c.req.param("email");
  try {
    const data = await c.env.DB.prepare(
      `select id, email, username, pwd, name, house, sim, gender,
        avatar, coreId, location, locked, uuid, createdAt, updatedAt,
        blocked from users where email = ?`,
    )
      .bind(email)
      .first();

    if (!data) {
      return c.json({ error: "Usuario no encontrado" }, 201);
    }

    return c.json(data || {});
  } catch (err) {
    return c.json({ msg: err }, 204);
  }
});

usersRoutes.get("/notLocked/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const data = await c.env.DB.prepare(
      `select * from users where id = ? and locked = 1`,
    )
      .bind(userId)
      .first();

    if (!data) {
      console.log("data vacia:", data);
      return c.json({ msg: "is ok" }, 200);
    } else {
      console.log("data cargada:", data);
      return c.json({ msg: "is locked" }, 400);
    }
  } catch (err) {
    return c.json({ msg: err }, 400);
  }
});

usersRoutes.get(
  "/core/:coreId/:userId",
  verifyToken(),
  verifyRoleLevel("neighborAdmin"),
  async (c) => {
    try {
      const userId = c.req.param("userId");
      const coreId = c.req.param("coreId");

      const data = await c.env.DB.prepare(
        `SELECT
        u.id, u.email,u.username, u.pwd,u.name,u.house,
        u.sim,u.gender,u.avatar,u.coreId,u.location,c.sim as coreSim,
        u.locked,u.uuid,u.createdAt,u.updatedAt,u.blocked,
        json_group_array(r.name) as roles
        FROM users u
        LEFT JOIN userRoles ur ON u.id = ur.userId
        LEFT JOIN roles r ON ur.roleId = r.id
        LEFT JOIN cores c ON c.id = u.coreId
        WHERE u.coreId = ?
        GROUP BY u.id, u.username, u.email;
      `,
      )
        .bind(coreId)
        .all();

      // Transformar los resultados: parsear roles de string a array
      const users = data.results.map((user) => ({
        ...user,
        roles: JSON.parse(user.roles), // ← Convertir string JSON a array
      }));

      if (users) {
        return c.json(users, 200);
      } else {
        return c.json({ msg: "is locked" }, 400);
      }
    } catch (err) {
      return c.json({ msg: err }, 400);
    }
  },
);

usersRoutes.post("/new/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const pkg = await c.req.json();
    console.log("userId: ", userId);
    console.log("pkg: ", pkg);

    // Construir la consulta dinámicamente
    const setClauses = [];
    const values = [];

    // Recorrer las propiedades de qry
    for (const [key, value] of Object.entries(pkg)) {
      setClauses.push(`${key} = ?`);
      values.push(value);
    }

    const qry =
      "INSERT INTO users" +
      "(email, username, pwd, name, house, sim, gender, avatar, coreId, location, locked, uuid, blocked)" +
      "values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);";

    console.log("values:", values);
    console.log("qry: ", qry);

    const result = await c.env.DB.prepare(qry)
      .bind(...values)
      .run();

    // Verificar si se actualizó algún registro
    if (result.meta.changes === 0) {
      return c.json(
        {
          error: "No se pudo crear el usuario",
        },
        404,
      );
    }

    // Respuesta exitosa
    return c.json({
      success: true,
      message: "Usuario agregado",
      data: {
        updated: qry,
        changes: result.meta.changes,
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return c.json(
      {
        error: "Error interno del servidor",
        details: error.message,
      },
      500,
    );
  }
});

usersRoutes.post("/chgItem", async (c) => {
  try {
    const { userId, qry } = await c.req.json();

    // Validaciones
    if (!userId || !qry || Object.keys(qry).length === 0) {
      return c.json(
        {
          error: "userId y qry son requeridos",
        },
        400,
      );
    }

    // Construir la consulta dinámicamente
    const setClauses = [];
    const values = [];

    // Recorrer las propiedades de qry
    for (const [key, value] of Object.entries(qry)) {
      setClauses.push(`${key} = ?`);
      values.push(value);
    }

    // Agregar userId para el WHERE
    values.push(userId);

    // Construir query final
    const query = `UPDATE users SET ${setClauses.join(", ")} WHERE id = ?`;

    // Ejecutar en D1 (SQLite de Cloudflare)
    const db = c.env.DB;
    const result = await db
      .prepare(query)
      .bind(...values)
      .run();

    // Verificar si se actualizó algún registro
    if (result.meta.changes === 0) {
      return c.json(
        {
          error: "No se actualizo el usuario",
        },
        404,
      );
    }

    // Respuesta exitosa
    return c.json(
      {
        success: true,
        message: "Usuario actualizado correctamente",
        data: {
          userId,
          updated: qry,
          changes: result.meta.changes,
        },
      },
      200,
    );
  } catch (error) {
    console.error("Error:", error);
    return c.json(
      {
        error: "Error interno del servidor",
        details: error.message,
      },
      500,
    );
  }
});

usersRoutes.post("/lockStatus/:userId", async (c) => {
  try {
    const { userId, qry } = c.req.json();

    console.log(`datos api, userId: ${userId}, qry: ${qry} `);

    // const data = await c.env.DB.prepare(
    //   `select * from users where id = ? and locked = 1`,
    // )
    //   .bind(userId)
    //   .first();

    // if (!data) {
    //   console.log("data vacia:", data);
    //   return c.json({ msg: "is ok" }, 200);
    // } else {
    //   console.log("data cargada:", data);
    //   return c.json({ msg: "is locked" }, 400);
    // }
    //
    return c.json({ msg: "is ok" }, 200);
  } catch (err) {
    return c.json({ msg: err }, 400);
  }
});

export default usersRoutes;

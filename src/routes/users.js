import { Hono } from "hono";
import { verifyToken, verifyRoleLevel } from "../auth/auth.js";

const usersRoutes = new Hono();
import { html } from "hono/html";

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

    // Crear token
    const setupToken = crypto.randomUUID();
    const expires = new Date(Date.now() + c.env.BACKSTAGE_TOKEN_EXPIRY); // Expira en 24 hora

    // Extraer roles explícitamente del pkg
    const { roles: rolesFromPkg, ...userData } = pkg;

    // Asegurar que roles sea un array plano
    let roles = [];
    if (rolesFromPkg) {
      if (Array.isArray(rolesFromPkg)) {
        roles = rolesFromPkg.flat(); // Convierte [[4]] en [4]
      }
    }

    const isDemo = pkg.demo;
    const adminEmail = pkg.adminEmail;

    delete pkg.adminEmail;
    delete pkg.demo;
    delete pkg.roles;

    // Agregar datos del token para setup password
    pkg.setup_token = setupToken;
    pkg.setup_expires = expires;

    if (await RowExists(c.env.DB, "users", { email: pkg.email })) {
      return c.json(
        {
          success: false,
          error: "email ya existe",
          details: `El email: ${pkg["email"]} ya existe`,
        },
        400,
      );
    }

    const result = addRecord(c.env.DB, "users", pkg);

    if (!(await result).success) {
      return c.json(
        {
          success: false,
          error: "Fallo al agregar usuario",
          details: error.message,
        },
        404,
      );
    }

    // Obtener el ID del usuario insertado
    const userIdQuery = await c.env.DB.prepare(
      "SELECT last_insert_rowid() as id",
    ).first();

    if (!userIdQuery) {
      throw new Error("No se pudo obtener el ID del usuario");
    }

    const newUserId = userIdQuery.id;

    //========= Insertar roles (si hay) =====================
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

    // ====== crea el correo pwdRst ==================

    const emailResponse = sendPwdRST(
      isDemo ? adminEmail : pkg.email,
      setupToken,
      c.env.public_host,
      c.env.images_root,
    );

    if (!(await emailResponse).success) {
      console.log("Error al enviar correo, ", (await emailResponse).details);
    }

    // Respuesta exitosa
    return c.json(
      {
        success: true,
        userId: newUserId,
        assignedRoles: roles,
        message: "Usuario creado y roles asignados",
      },
      201,
    );
  } catch (error) {
    console.error("Error:", error);

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

usersRoutes.post("/backstage", async (c) => {
  // const { email, name } = await c.req.json()
  const email = "ricardogueta@gmail.com";
  const name = "Ricardo Gueta";
  const setupToken = crypto.randomUUID();
  const expires = Date.now() + c.env.BACKSTAGE_TOKEN_EXPIRY; // Expira en 24 hora

  const setupUrl = `${c.env.public_host}setupPassword?token=${setupToken}`;

  // 3. Enviar el correo (ejemplo usando una API como Resend o Mailer)
  const emailRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${c.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "onboarding@resend.dev",
      to: [email],
      subject: "Configura tu contraseña",
      html: await pwdRST_HTML(c.env.public_host, c.env.images_root, setupToken),
    }),
  });

  return c.json({ success: true, message: "Usuario creado y correo enviado" });
});

usersRoutes.get("/setupPassword/:token", (c) => {
  const token = c.req.param("token");

  if (!token) return c.text("Token faltante", 400);

  return c.html(html`
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Configurar Contraseña</title>
        <style>
          body {
            font-family: sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background: #f4f4f9;
            margin: 0;
          }
          .card {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            width: 100%;
            max-width: 400px;
          }
          input {
            width: 100%;
            padding: 10px;
            margin: 10px 0;
            border: 1px solid #ddd;
            border-radius: 4px;
            box-sizing: border-box;
          }
          button {
            width: 100%;
            padding: 10px;
            background: #3880ff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          }
          button:disabled {
            background: #ccc;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>Nueva Contraseña</h2>
          <p>Crea una contraseña para activar tu cuenta.</p>
          <form action="/api/users/completeSetup" method="POST">
            <input type="hidden" name="token" value="${token}" />
            <input
              type="password"
              name="password"
              placeholder="Mínimo 8 caracteres"
              required
              minlength="8"
            />
            <input
              type="password"
              name="confirm"
              placeholder="Confirma tu contraseña"
              required
            />
            <button type="submit">Activar Cuenta</button>
          </form>

          <script>
            // Este script corre en el navegador del usuario, NO en el correo.
            document.querySelector("form").onsubmit = function (e) {
              const p1 = this.password.value;
              const p2 = this.confirm.value;
              if (p1 !== p2) {
                alert("Las contraseñas no coinciden");
                e.preventDefault();
              }
            };
          </script>
        </div>
      </body>
    </html>
  `);
});

usersRoutes.post("/completeSetup", async (c) => {
  try {
    const body = await c.req.parseBody();
    const { token, password } = body;

    // const token = c.req.param("token");
    console.log(`token: ${token}, pwd: ${password}`);
  } catch (err) {
    return c.json(
      {
        msg: "error",
        detail: err.message,
      },
      400,
    );
  }

  return c.json({ msg: "Ok" }, 200);
});

usersRoutes.post("/completeSetup__", async (c) => {
  const body = await c.req.parseBody();
  const { token, password } = body;

  try {
    // 1. Validar token en D1
    const user = await c.env.DB.prepare(
      "SELECT id, setup_expires FROM users WHERE setup_token = ?",
    )
      .bind(token)
      .first();

    if (!user || Date.now() > user.setup_expires) {
      return c.html("<h1>Error: El enlace expiró o es inválido</h1>", 400);
    }

    // 2. Encriptar (usando la función Web Crypto que vimos antes)
    const hashedPassword = await hashPassword(password);

    // 3. Actualizar y Limpiar
    await c.env.DB.prepare(
      `
      UPDATE users
      SET password = ?, setup_token = NULL, setup_expires = NULL, status = 'active'
      WHERE id = ?
    `,
    )
      .bind(hashedPassword, user.id)
      .run();

    return c.html(`
      <div style="text-align:center; padding: 50px; font-family: sans-serif;">
        <h1>¡Cuenta activada!</h1>
        <p>Ya puedes cerrar esta ventana y entrar a la app.</p>
      </div>
    `);
  } catch (err) {
    return c.text("Error interno", 500);
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

usersRoutes.delete("/:userId/:delUserId", async (c) => {
  try {
    const userId = c.req.param("delUserId");

    const result = deleteRecord(c.env.DB, "users", { id: userId });
    if ((await result).success) {
      return c.json(
        {
          success: true,
          message: `Usuario ${userId} y sus roles eliminados correctamente`,
        },
        200,
      );
    } else {
      return c.json(
        {
          success: false,
          error: `Fallo eliminar usuario ${userId}`,
        },
        400,
      );
    }
  } catch (error) {
    console.error("Error:", error);
    return c.json(
      {
        success: false,
        error: "Error en servidor",
        details: error.message,
      },
      500,
    );
  }
});

async function sendPwdRST(email, token, publicHost, imagesRoot) {
  const setupUrl = `${publicHost}/setupPassword?token=${token}`;

  try {
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${c.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to: [email],
        subject: "Configura tu contraseña",
        html: await pwdRST_HTML(publicHost, imagesRoot, token),
      }),
    });
    return { success: true, message: "Correo enviado" };
  } catch (err) {
    return {
      success: false,
      message: "Fallo envio de correo",
      details: err.message,
    };
  }
}

/*
  fields: debe ser json: {"field": value}
*/
async function RowExists(DB, table, fields) {
  try {
    // Validar parámetros
    if (!table || typeof table !== "string") {
      throw new Error("El nombre de la tabla es requerido y debe ser texto");
    }

    if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
      throw new Error("Los campos deben ser un objeto JSON válido");
    }

    if (Object.keys(fields).length === 0) {
      throw new Error("Debes proporcionar al menos un campo para la búsqueda");
    }

    // Construir la consulta dinámicamente
    const conditions = [];
    const values = [];

    for (const [key, value] of Object.entries(fields)) {
      conditions.push(`${key} = ?`);
      values.push(value);
    }

    const whereClause = conditions.join(" AND ");
    const query = `SELECT COUNT(*) as count FROM ${table} WHERE ${whereClause} LIMIT 1`;

    // Ejecutar la consulta
    const result = await DB.prepare(query)
      .bind(...values)
      .first();

    return result.count > 0;
  } catch (error) {
    return false;
  }
}

async function deleteRecord(DB, table, fields) {
  try {
    // Validar parámetros
    if (!table || typeof table !== "string") {
      throw new Error("El nombre de la tabla es requerido y debe ser texto");
    }

    if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
      throw new Error("Los campos deben ser un objeto JSON válido");
    }

    if (Object.keys(fields).length === 0) {
      throw new Error("Debes proporcionar al menos un campo para la búsqueda");
    }

    // Primero verificar si el registro existe
    const conditions = [];
    const values = [];

    for (const [key, value] of Object.entries(fields)) {
      conditions.push(`${key} = ?`);
      values.push(value);
    }

    const whereClause = conditions.join(" AND ");

    // Verificar existencia
    const checkQuery = `SELECT COUNT(*) as count FROM ${table} WHERE ${whereClause}`;
    const checkResult = await DB.prepare(checkQuery)
      .bind(...values)
      .first();

    const exists = checkResult.count > 0;

    if (!exists) {
      return {
        success: false,
        deleted: false,
        message: "Registro no encontrado",
        table,
        conditions: fields,
      };
    }

    // Eliminar el registro
    const deleteQuery = `DELETE FROM ${table} WHERE ${whereClause}`;
    const deleteResult = await DB.prepare(deleteQuery)
      .bind(...values)
      .run();

    console.log("deleteResult: ", deleteResult);

    return {
      success: true,
      deleted: true,
      message: "Registro eliminado correctamente",
      changes: deleteResult.meta?.changes || 0,
      table,
      conditions: fields,
    };
  } catch (error) {
    console.error("Error en deleteRecord:", error);
    throw error;
  }
}

async function addRecord(DB, table, fields) {
  // Validar que hay campos para insertar
  if (!fields || Object.keys(fields).length === 0) {
    throw new Error("No se proporcionaron campos para insertar");
  }

  // Obtener las columnas y valores
  const columns = Object.keys(fields);
  const values = Object.values(fields);

  // Crear placeholders para SQL (?, ?, ?)
  const placeholders = values.map(() => "?").join(", ");

  // Construir la consulta SQL
  const sql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`;

  try {
    // Ejecutar la inserción
    const result = await DB.prepare(sql)
      .bind(...values)
      .run();

    return {
      success: true,
      meta: result.meta,
      id: result.meta.last_row_id,
    };
  } catch (error) {
    console.error(`Error insertando en ${table}:`, error);
    throw new Error(`Error al insertar registro: ${error.message}`);
  }
}

async function pwdRST_HTML(publicHost, imagesRoot, token) {
  const html = `
    <!DOCTYPE html>
    <html>
        <head>
            <meta charset='utf-8'>
            <meta http-equiv='X-UA-Compatible' content='IE=edge'>
            <title>Recupera contraseña</title>
            <meta name='viewport' content='width=device-width, initial-scale=1'>
            <style>
                body {margin:15vh 20vw}
                a {display:flex; justify-content: center; align-items: center; margin-left: auto; margin-right: auto; height: 30px;
                    width: 200px;text-decoration: none;}
                a input {cursor: pointer; display:inline;background-color:#6599CE;border:0;color:white; margin-left: auto;
                    margin-right: auto;height: 30px; width: 200px; border-radius: 10px}
                .logo img {height: 90px; width: 100px; border-radius: 50%; margin-left: 20px;}
            </style>
        </head>
        <body>
            <div class="head">
                <div class="logo">
                    <img src=${imagesRoot}logo_v2.png>
                </div>
            </div>
            <h3>Reinicio de contraseña</h3>
            <p>Hola !</p>
            <p>Hemos recibido una solicitud de reinicio de contraseña para tu cuenta,
                con gusto te ayudaremos con tu solicitud, para continuar con este proceso haz click
                en el siguiente boton
            </p>
            <a href=${publicHost}/api/users/completeSetup?token=${token} target='#'>
                <input type="button" value="RECUPERAR CLAVE">
            </a>
            <p>
                Si no quieres reiniciar tu contraseña, tan solo ignora este correo y accesa a nuestros servicios
                como usualmente lo haces.
            </p>
        </body>

    </html>
    `;
  return html;
}

async function pwdRST_HTML_(token) {
  const html = `
    <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Configurar Contraseña</title>
          <style>
            body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background: #f4f4f9; margin: 0; }
            .card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); width: 100%; max-width: 400px; }
            input { width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
            button { width: 100%; padding: 10px; background: #3880ff; color: white; border: none; border-radius: 4px; cursor: pointer; }
            button:disabled { background: #ccc; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Nueva Contraseña</h2>
            <p>Crea una contraseña para activar tu cuenta.</p>
            <form action="/completeSetup" method="POST">
              <input type="hidden" name="token" value="${token}">
              <input type="password" name="password" placeholder="Mínimo 8 caracteres" required minlength="8">
              <input type="password" name="confirm" placeholder="Confirma tu contraseña" required>
              <button type="submit">Activar Cuenta</button>
            </form>
          </div>
          <script>
            const form = document.querySelector('form');
            form.onsubmit = (e) => {
              if(form.password.value !== form.confirm.value) {
                alert('Las contraseñas no coinciden');
                return false;
              }
            };
          </script>
        </body>
        </html>
    `;
  return html;
}

export default usersRoutes;

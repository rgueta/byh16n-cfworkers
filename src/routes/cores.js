import { Hono } from "hono";

const coresRoutes = new Hono();

coresRoutes.get("/:userId", async (c) => {
  const userId = c.req.param("userId");
  try {
    const data = await c.env.DB.prepare(
      `
      SELECT
          c.id,
          c.name,
          c.shortName,
          c.address,
          c.houses,
          c.sim,
          c.email,
          c.enable,
          c.remote,
          c.code_expire,
          c.webService,
          c.contact_name,
          c.contact_email,
          c.contact_cell,
          c.description,
          co.shortName || '.' || s.shortName || '.' || ci.shortName ||
          '.' || d.shortName || '.' || cp.shortName || '.' || c.shortName AS location
      FROM cores c
      JOIN cpus cp ON cp.id = c.cpuId
      JOIN geolocations g ON g.id = c.geoId
      JOIN divisions d ON d.id = cp.divisionId
      JOIN cities ci ON ci.id = d.cityId
      JOIN states s ON s.id = ci.stateId
      JOIN countries co ON co.id = ci.countryId
      ORDER BY c.id;
      `,
    )
      .bind(userId)
      .all();

    if (!data) {
      return c.json({ error: "codigos no encontrados" }, 401);
    }

    return c.json(data || {}, 200);
  } catch (err) {
    return c.json({ msg: err }, 404);
  }
});

coresRoutes.get("/cpu/:cpuName/:userId", async (c) => {
  const userId = c.req.param("userId");
  try {
    const data = await c.env.DB.prepare(
      `
      SELECT
          c.id,
          c.name,
          c.shortName,
          c.address,
          c.houses,
          c.sim,
          c.email,
          c.enable,
          c.remote,
          c.code_expire,
          c.webService,
          c.contact_name,
          c.contact_email,
          c.contact_cell,
          c.description,
          co.shortName || '.' || s.shortName || '.' || ci.shortName ||
          '.' || d.shortName || '.' || cp.shortName || '.' || c.shortName AS location
      FROM cores c
      JOIN cpus cp ON cp.id = c.cpuId
      JOIN geolocations g ON g.id = c.geoId
      JOIN divisions d ON d.id = cp.divisionId
      JOIN cities ci ON ci.id = d.cityId
      JOIN states s ON s.id = ci.stateId
      JOIN countries co ON co.id = ci.countryId
      WHERE cp.name = ?
      ORDER BY c.id;
      `,
    )
      .bind(cpuName)
      .all();

    if (!data) {
      return c.json({ error: "codigos no encontrados" }, 401);
    }

    return c.json(data || {}, 200);
  } catch (err) {
    return c.json({ msg: err }, 404);
  }
});

coresRoutes.get("/admin/:userId", async (c) => {
  const userId = c.req.param("userId");

  try {
    const data = await c.env.DB.prepare(
      ` SELECT
        c.id,
        c.name,
        c.shortName,
        c.address,
        c.houses,
        c.sim,
        c.email,
        c.enable,
        c.remote,
        c.code_expire,
        c.webService,
        c.contact_name,
        c.contact_email,
        c.contact_cell,
        c.description,
        co.shortName || '.' || s.shortName || '.' || ci.shortName ||
        '.' || d.shortName || '.' || cp.shortName || '.' || c.shortName AS location,
        g.latitud,
        g.longitud
    FROM cores c
    JOIN cpus cp ON cp.id = c.cpuId
    JOIN geolocations g ON g.id = c.geoId
    JOIN divisions d ON d.id = cp.divisionId
    JOIN cities ci ON ci.id = d.cityId
    JOIN states s ON s.id = ci.stateId
    JOIN countries co ON co.id = ci.countryId
      `,
    ).all();

    if (!data) {
      return c.json({ error: "codigos no encontrados" }, 401);
    }

    return c.json(data || {}, 200);
  } catch (err) {
    return c.json({ msg: err }, 404);
  }
});

coresRoutes.put("/update/:userId/:codeId", async (c) => {
  const body = await c.req.json();
  console.log("body-->", body);
  return c.json({ msg: "ok" });
});

coresRoutes.post("/:userId", async (c) => {
  const body = await c.req.json();
  console.log("body-->", body);
  return c.json({ msg: "ok" });
});

coresRoutes.post("/chgItem/:userId", async (c) => {
  try {
    const { coreId, qry } = await c.req.json();

    // Validaciones
    if (!coreId || !qry || Object.keys(qry).length === 0) {
      return c.json(
        {
          error: "coreId y qry son requeridos",
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

    // Agregar coreId para el WHERE
    values.push(coreId);

    // Construir query final
    const query = `UPDATE cores SET ${setClauses.join(", ")} WHERE id = ?`;
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
          error: "No se encontró el core con el ID especificado",
        },
        404,
      );
    }

    // Respuesta exitosa
    return c.json({
      success: true,
      message: "Core actualizado correctamente",
      data: {
        coreId,
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

coresRoutes.post("/chgSim/:userId", async (c) => {
  try {
    const body = await c.req.json();

    const query = `UPDATE cores SET sim = ? WHERE id = ?`;
    const result = await c.env.DB.prepare(query)
      .bind(body.newSim, body.coreId)
      .run();

    if (result.meta.changes === 0) {
      return c.json({ error: "core no encontrado" }, 404);
    }

    return c.json(
      {
        success: true,
        message: "core sim actualizado correctamente",
        changes: result.meta.changes,
      },
      200,
    );
  } catch (error) {
    console.error("Error:", error);
    return c.json({ error: "Error interno del servidor" }, 500);
  }
});

export default coresRoutes;

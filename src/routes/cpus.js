import { Hono } from "hono";
import { verifyToken, verifyRoleLevel } from "../auth/auth.js";

const cpusRoutes = new Hono();

cpusRoutes.get("/:userId", async (c) => {
  const userId = c.req.param("userId");
  try {
    const data = await c.env.DB.prepare(
      `
      SELECT
          cp.id,
          cp.name,
          co.shortName || '.' || s.shortName || '.' || ci.shortName ||
          '.' || d.shortName || '.' || cp.shortName AS location
      FROM cpus cp
      LEFT JOIN divisions d ON d.id = cp.divisionId
      LEFT JOIN cities ci ON ci.id = d.cityId
      LEFT JOIN states s ON s.id = ci.stateId
      LEFT JOIN countries co ON co.id = ci.countryId
      LEFT JOIN cores c ON cp.id = c.cpuId
      LEFT JOIN geolocations g ON g.id = c.geoId
      GROUP BY cp.id, cp.name, co.shortName, s.shortName, ci.shortName, d.shortName, cp.shortName
      ORDER BY cp.id;
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

cpusRoutes.get("/basic/:divisionId/:userId", async (c) => {
  try {
    const divisionId = c.req.param("divisionId");
    const userId = c.req.param("userId");

    if (!divisionId) {
      return c.json({
        success: false,
        error: "parametros requeridos",
        details: "Falta parametro divisionId",
      });
    }

    const data = await c.env.DB.prepare(
      `
      SELECT
          id,
          name,
          shortName
      FROM cpus
      WHERE divisionId = ?;
      `,
    )
      .bind(divisionId)
      .all();

    if (!data) {
      return c.json({ error: "cpus no encontrados" }, 401);
    }

    return c.json(data.results || {}, 200);
  } catch (err) {
    return c.json({ success: false, msg: err.message }, 404);
  }
});

export default cpusRoutes;

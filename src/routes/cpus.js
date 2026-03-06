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
          '.' || d.shortName || '.' || cp.shortName ||
          CASE WHEN COUNT(c.shortName) > 0
               THEN '.' || GROUP_CONCAT(c.shortName, '.')
               ELSE ''
          END AS location
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

    console.log("cpus: ", data);
    return c.json(data || {}, 200);
  } catch (err) {
    return c.json({ msg: err }, 404);
  }
});

export default cpusRoutes;

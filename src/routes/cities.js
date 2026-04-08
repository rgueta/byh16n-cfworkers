import { Hono } from "hono";
import { verifyToken, verifyRoleLevel } from "../auth/auth.js";

const citiesRoutes = new Hono();

citiesRoutes.get("/:country/:state/:userId", async (c) => {
  const country = c.req.param("country");
  const state = c.req.param("state");
  if (!country || !state) {
    return c.json({
      success: false,
      error: "parametros requeridos",
      details: "Falta parametro country o state",
    });
  }

  const userId = c.req.param("userId");
  try {
    const data = await c.env.DB.prepare(
      `
      SELECT
          ci.id,
          ci.name,
          ci.shortName FROM cities ci
          INNER JOIN states s ON s.id = ci.stateId
          INNER JOIN countries c ON c.id = ci.countryId
          WHERE c.shortName = ? AND s.shortName = ?
          ORDER BY s.name;`,
    )
      .bind(country, state)
      .all();

    if (!data) {
      return c.json({ error: "cities no encontradas" }, 401);
    }

    return c.json(data.results || {}, 200);
  } catch (err) {
    return c.json({ msg: err }, 404);
  }
});

export default citiesRoutes;

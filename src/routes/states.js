import { Hono } from "hono";
import { verifyToken, verifyRoleLevel } from "../auth/auth.js";

const statesRoutes = new Hono();

statesRoutes.get("/:country/:userId", async (c) => {
  const country = c.req.param("country");
  if (!country) {
    return c.json({
      success: false,
      error: "parametro country es requerido",
      details: "Falta que mandes el parametro country shortName",
    });
  }
  const userId = c.req.param("userId");
  try {
    const data = await c.env.DB.prepare(
      `
      SELECT
          s.id,
          s.name,
          s.shortName FROM states s
          INNER JOIN countries c ON c.id = s.countryId
          WHERE c.shortName = ?
          ORDER BY s.name;`,
    )
      .bind(country)
      .all();

    if (!data) {
      return c.json({ error: "states no encontrados" }, 401);
    }

    return c.json(data.results || {}, 200);
  } catch (err) {
    return c.json({ msg: err }, 404);
  }
});

export default statesRoutes;

import { Hono } from "hono";
import { verifyToken, verifyRoleLevel } from "../auth/auth.js";

const divisionsRoutes = new Hono();

divisionsRoutes.get("/:country/:state/:cityId/:userId", async (c) => {
  const country = c.req.param("country");
  const state = c.req.param("state");
  const cityId = c.req.param("cityId");

  if (!cityId) {
    return c.json({
      success: false,
      error: "parametros requeridos",
      details: "Falta parametro cityId",
    });
  }

  const userId = c.req.param("userId");
  try {
    const data = await c.env.DB.prepare(
      `
      SELECT
          id,
          name,
          shortName,
          pc,
          description
          FROM divisions
          WHERE cityId = ?
          ORDER BY shortName;`,
    )
      .bind(cityId)
      .all();

    if (!data) {
      return c.json({ error: "division no encontrada" }, 401);
    }

    return c.json(data.results || {}, 200);
  } catch (err) {
    return c.json({ success: false, msg: err.message }, 404);
  }
});

export default divisionsRoutes;

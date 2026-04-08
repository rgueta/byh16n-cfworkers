import { Hono } from "hono";
import { verifyToken, verifyRoleLevel } from "../auth/auth.js";

const countriesRoutes = new Hono();

countriesRoutes.get("/:userId", async (c) => {
  const userId = c.req.param("userId");
  try {
    const data = await c.env.DB.prepare(
      `
      SELECT
          id,
          name,
          shortName FROM countries;`,
    ).all();

    if (!data) {
      return c.json({ error: "countries no encontrados" }, 401);
    }

    return c.json(data.results || {}, 200);
  } catch (err) {
    return c.json({ msg: err }, 404);
  }
});

export default countriesRoutes;

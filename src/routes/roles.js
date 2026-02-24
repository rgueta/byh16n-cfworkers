import { Hono } from "hono";
import { verifyToken, verifyRoleLevel } from "../auth/auth.js";

const rolesRoutes = new Hono();

rolesRoutes.get(
  "/:userId",
  verifyToken(),
  verifyRoleLevel("neighbor"),
  async (c) => {
    const userId = c.req.param("userId");
    try {
      const data = await c.env.DB.prepare(`SELECT * FROM roles;`).all();

      if (!data) {
        return c.json({ error: "roles no encontrados" }, 401);
      }

      return c.json(data || {}, 200);
    } catch (err) {
      return c.json({ msg: err }, 404);
    }
  },
);

export default rolesRoutes;

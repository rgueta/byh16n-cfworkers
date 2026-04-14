import { Hono } from "hono";
import { verifyToken, verifyRoleLevel } from "../auth/auth.js";

const infoRoutes = new Hono();

infoRoutes.get("/:userId/:now", async (c) => {
  const userId = c.req.param("userId");
  try {
    const data = await c.env.DB.prepare(`SELECT * FROM information;`).all();

    if (!data) {
      return c.json({ error: "codigos no encontrados" }, 401);
    }

    return c.json(data.results || {}, 200);
  } catch (err) {
    return c.json({ msg: err }, 404);
  }
});

infoRoutes.post("/:userId", async (c) => {
  const body = c.req.body();
  console.log("info: ", body);
  return c.json({ success: true }, 200);
});

export default infoRoutes;

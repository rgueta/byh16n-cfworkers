import { Hono } from "hono";
import { verifyToken, verifyRoleLevel } from "../auth/auth.js";

const infoRoutes = new Hono();

infoRoutes.get("/:userId/:now", async (c) => {
  const userId = c.req.param("userId");
  try {
    const data = await c.env.DB.prepare(
      `SELECT * FROM information ORDER BY createdAt DESC;`,
    ).all();

    if (!data) {
      return c.json({ error: "codigos no encontrados" }, 401);
    }

    return c.json(data.results || {}, 200);
  } catch (err) {
    return c.json({ msg: err }, 404);
  }
});

infoRoutes.get("/recent/:recent/:limit", async (c) => {
  const recent = c.req.param("recent");
  const limit = c.req.param("limit");
  console.log(`recent: ${recent}, limit: ${limit}`);
  try {
    const query = `SELECT i.id, i.title, i.url, i.image, i.path, i.description, i.location,
    i.size, i.like, i.disable, i.userId, u.name, i.createdAt, i.updatedAt
    FROM information i
    INNER JOIN users u ON u.id = i.userId
    WHERE i.createdAt > ?
    ORDER BY i.createdAt DESC
    LIMIT ?;`;

    const { results } = await c.env.DB.prepare(query).bind(recent, limit).all();

    console.log("info: ", results.length);

    if (!results) {
      return c.json({ error: "info no encontrados" }, 401);
    }

    return c.json(results);
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

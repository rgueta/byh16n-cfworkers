import { Hono } from "hono";

const codeRoutes = new Hono();

codeRoutes.get("/user/:userId", async (c) => {
  const userId = c.req.param("userId");
  try {
    const data = await c.env.DB.prepare(
      `
        SELECT
        c.id,
        c.code,
        c.createdAt,
        c.initial,
        c.expiry,
        c.enable,
        u.id AS userId,
        u.username,
        u.email,
        u.avatar,
        v.sim as visitorSim,
        v.name as visitorName
      FROM codes c
      LEFT JOIN users u ON c.userId = u.id
      LEFT JOIN visitors v ON v.id = c.visitorId
      WHERE u.id = ?
      ORDER BY c.expiry DESC
      LIMIT 20;
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

codeRoutes.put("/update/:userId/:codeId", async (c) => {
  const body = await c.req.json();
  console.log("body-->", body);
  return c.json({ msg: "ok" });
});

codeRoutes.post("/:userId", async (c) => {
  const body = await c.req.json();
  console.log("body-->", body);
  return c.json({ msg: "ok" });
});

export default codeRoutes;

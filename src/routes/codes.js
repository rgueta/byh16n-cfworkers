import { Hono } from "hono";
import { verifyToken, verifyRoleLevel } from "../auth/auth.js";
const codeRoutes = new Hono();
import { addRecord } from "./../tools.js";

codeRoutes.get(
  "/user/:userId",
  verifyToken(),
  verifyRoleLevel("neighbor"),
  async (c) => {
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
        c.comment,
        u.id AS userId,
        u.username,
        u.email,
        u.avatar
      FROM codes c
      LEFT JOIN users u ON c.userId = u.id
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
  },
);

codeRoutes.put("/update/:userId/:codeId", async (c) => {
  const body = await c.req.json();
  console.log("body-->", body);
  return c.json({ msg: "ok" });
});

codeRoutes.post("/:userId", async (c) => {
  try {
    const body = await c.req.json();

    const { code, userId, device_plaform, initial, expiry, comment } = body;
    const pkg = {
      code: code,
      userId: userId,
      device_plaform: device_plaform,
      initial: initial,
      expiry: expiry,
      comment: comment,
    };

    const result = await addRecord(c.env.DB, "codes", pkg);

    return c.json(
      {
        success: true,
        msg: "codigo agregado",
        data: result.data,
      },
      200,
    );
  } catch (err) {
    return c.json(
      {
        success: false,
        msg: "error",
        details: err.message,
      },
      401,
    );
  }
});

export default codeRoutes;

import { Hono } from "hono";
import { verifyToken, verifyRoleLevel } from "../auth/auth.js";

const codeEventsRoutes = new Hono();

codeEventsRoutes.get(
  "/:userId/:start/:end",
  verifyToken(),
  verifyRoleLevel("neighbor"),
  async (c) => {
    if (c.req.param("userId") === undefined) {
      return c.json({ msg: "userId not received on server" }, 303);
    }

    if (c.req.param("start") != null && c.req.param("end") != null) {
      const query = `
        SELECT ce.*,c.code,u.house FROM code_events ce
        LEFT JOIN codes c ON c.id = ce.codeId
        LEFT JOIN users u ON u.id = c.userId
        WHERE ce.createdAt BETWEEN ? AND ?
        ORDER BY createdAt DESC`;

      const result = await c.env.DB.prepare(query)
        .bind(c.req.param("start"), c.req.param("end"))
        .all();

      return c.json(result, 200);
    } else {
      return c.json({ msg: "falta iformacion" }, 401);
    }
  },
);

codeEventsRoutes.get(
  "/recent/:userId/:recent/:limit",
  // verifyToken(),
  // verifyRoleLevel("neighbor"),
  async (c) => {
    try {
      const userId = c.req.param("userId");
      const recent = c.req.param("recent");
      const limit = c.req.param("limit");
      if (userId === undefined || recent === undefined || limit === undefined) {
        return c.json({ msg: "faltan parametros para la consulta" }, 303);
      }

      const query = `
        SELECT ce.*,c.code,u.house
        FROM code_events ce
        LEFT JOIN codes c ON c.id = ce.codeId
        LEFT JOIN users u ON u.id = c.userId
        WHERE u.id = ? and ce.createdAt > ?
        ORDER BY ce.createdAt DESC
        LIMIT ?;`;

      const { results } = await c.env.DB.prepare(query)
        .bind(userId, recent, limit)
        .all();

      // console.log("query: ", result.query);

      console.log("codeEvents: ", results.length);
      return c.json(results, 200);
    } catch (err) {
      return c.json({ msg: err.message }, 404);
    }
  },
);

export function debugSQL(sql, binds = []) {
  let i = 0;

  return sql.replace(/\?/g, () => {
    const val = binds[i++];

    if (val === null || val === undefined) return "NULL";
    if (typeof val === "number") return val;
    if (typeof val === "boolean") return val ? 1 : 0;

    // strings / dates
    return `'${String(val).replace(/'/g, "''")}'`;
  });
}

export default codeEventsRoutes;

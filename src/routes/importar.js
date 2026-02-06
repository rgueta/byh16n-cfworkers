import { Hono } from "hono";
import { insertarDesdeJSON } from "../lib/d1.js";

const app = new Hono();

app.post("/", async (c) => {
  const { tabla, data } = await c.req.json();

  if (!tabla || !data) {
    return c.json({ error: "tabla y data son requeridos" }, 400);
  }

  const id = await insertarDesdeJSON(c.env.DB, tabla, data);

  return c.json({
    ok: true,
    id_insertado: id,
  });
});

export default app;

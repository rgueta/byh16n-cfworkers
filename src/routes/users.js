import { Hono } from "hono";

const usersRoutes = new Hono();

usersRoutes.get("/:email", async (c) => {
  const email = c.req.param("email");

  console.log("email: ", email);
  const data = await c.env.DB.prepare(
    `select id, email, username, pwd, name, house, sim, gender,
      avatar, coreId, location, locked, uuid, createdAt, updatedAt,
      blocked from users where email = ?`,
  )
    .bind(email)
    .first();

  if (!data) {
    return c.json({ error: "Usuario no encontrado" }, 404);
  }
  console.log("data: ", data);
  return c.json(data || {});
});
export default usersRoutes;

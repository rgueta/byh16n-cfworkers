import { Hono } from "hono";
import { mongoRequest } from "../lib/mongo.js";

export const usersRoutes = new Hono();

usersRoutes.get("/:email", async (c) => {
  const email = c.req.param("email");
  console.log("env: ", c.env);
  const data = await mongoRequest(c, "findOne", {
    database: c.env.MONGO_DB,
    collection: "users",
    filter: { email },
  });
  console.log("data: ", data);

  return c.json(data.document || {});
});

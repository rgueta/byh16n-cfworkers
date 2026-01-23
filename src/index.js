import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => c.text("OK"));

app.get("/debug/env", (c) => {
  return c.json({
    message: "env ok",
    env: c.env,
  });
});

export default {
  fetch(request, env, ctx) {
    return app.fetch(request, env, ctx);
  },
};

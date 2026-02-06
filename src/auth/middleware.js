import { jwt } from "hono/jwt";

export const authMiddleware = () =>
  jwt({
    secret: (c) => c.env.JWT_SECRET,
  });

import { jwt } from "hono/jwt";
export const jwtAuth = (c, next) =>
  jwt({
    secret: (c) => c.env.JWT_SECRET,
    alg: "HS256", // ⬅️ OBLIGATORIO
  })(c, next);

import { jwt } from "hono/jwt";

export const authMiddleware = () => {
  return async (c, next) => {
    const jwtMw = jwt({
      secret: c.env.JWT_SECRET, // ✅ AHORA sí existe
      alg: "HS256",
    });

    return jwtMw(c, next);
  };
};

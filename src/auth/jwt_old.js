import { sign, verify } from "hono/jwt";

export const createJWT = async (
  payload,
  secret = "",
  expiresInSeconds = 60 * 60 * 24, // 24hrs
) => {
  return await sign(
    {
      ...payload,
      exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
    },
    secret,
  );
};

export const verifyJWT = async (token, secret) => {
  return await verify(token, secret);
};

// module.exports = {
//   createJWT,
//   verifyJWT,
// };

// jwt({
//     secret: (c) => c.env.JWT_SECRET,
//     alg: "HS256", // ⬅️ OBLIGATORIO
//   })(c, next);

import { cors } from "hono/cors";

export const corsMiddleware = cors({
  origin: [
    "http://localhost:8100", // Ionic dev
    "http://127.0.0.1:8100",
    "capacitor://localhost",
  ],
  allowHeaders: ["Authorization", "Content-Type"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
});

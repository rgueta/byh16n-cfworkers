import { cors } from "hono/cors";

export const corsMiddleware = cors({
  origin: [
    "http://localhost:8100", // Ionic dev
    "http://127.0.0.1:8100",
    "capacitor://localhost",
    "http://localhost",
    "http://192.168.1.170:8787",
  ],
  allowHeaders: ["Authorization", "Content-Type", "X-Requested-With"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  exposeHeaders: ["Content-Length", "Content-Type", "ETag"],
  credentials: true,
});

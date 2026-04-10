import "./services/providers/register";
import cors from "cors";
import express from "express";
import morgan from "morgan";
import { loadEnv } from "./config";
import { registerRoutes } from "./routes";
import { setupSwagger } from "./config/swagger";
import { errorMiddleware } from "./middleware/error.middleware";

export function createApp(): express.Express {
  const env = loadEnv();
  const app = express();
  const corsOrigin =
    env.CORS_ORIGIN && env.CORS_ORIGIN.trim() !== ""
      ? env.CORS_ORIGIN.split(",").map((o) => o.trim())
      : true;
  app.use(
    cors({
      origin: corsOrigin,
      methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    }),
  );
  app.use(morgan("combined"));
  registerRoutes(app);
  setupSwagger(app);
  app.use(errorMiddleware);
  return app;
}

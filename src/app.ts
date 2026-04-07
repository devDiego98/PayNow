import "./services/providers/register";
import express from "express";
import morgan from "morgan";
import { registerRoutes } from "./routes";
import { setupSwagger } from "./config/swagger";
import { errorMiddleware } from "./middleware/error.middleware";

export function createApp(): express.Express {
  const app = express();
  app.use(morgan("combined"));
  registerRoutes(app);
  setupSwagger(app);
  app.use(errorMiddleware);
  return app;
}

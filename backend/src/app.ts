import cookieParser from "cookie-parser";
import cors from "cors";
import rateLimit from "express-rate-limit";
import express, { Express } from "express";
import helmet from "helmet";
import path from "node:path";
import { logger } from "./logger.js";
import { clientIdMiddleware, requestContextMiddleware } from "./middleware.js";
import { registerAuthRoutes } from "./routes/auth-routes.js";
import { registerDashboardRoutes } from "./routes/dashboard-routes.js";
import { registerHistoryRoutes } from "./routes/history-routes.js";
import { registerPageRoutes } from "./routes/page-routes.js";
import { registerWorkoutRoutes } from "./routes/workout-routes.js";

const API_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const API_RATE_LIMIT_MAX_REQUESTS = 120;
const DEVELOPMENT_CORS_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

function getAllowedCorsOrigins(): string[] {
  const configuredOrigins = (process.env.CORS_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configuredOrigins.length > 0) {
    return configuredOrigins;
  }

  if (process.env.NODE_ENV !== "production") {
    return DEVELOPMENT_CORS_ORIGINS;
  }

  return [];
}

function isDevelopmentLocalOrigin(origin: string): boolean {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}

export function createApp(): Express {
  const app = express();
  const allowedOrigins = getAllowedCorsOrigins();

  app.disable("x-powered-by");
  app.use(requestContextMiddleware);
  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );

  app.use(
    cors({
      credentials: true,
      origin: (origin, callback) => {
        if (!origin) {
          // Permite chamadas sem Origin (curl, health checks e integrações server-to-server).
          callback(null, true);
          return;
        }

        if (allowedOrigins.includes(origin) || isDevelopmentLocalOrigin(origin)) {
          logger.debug("cors_origin_allowed", { origin });
          callback(null, true);
          return;
        }

        logger.warn("cors_origin_blocked", { origin });
        callback(null, false);
      },
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(clientIdMiddleware);
  app.use(express.static(path.resolve("frontend")));
  app.use(
    "/api",
    rateLimit({
      windowMs: API_RATE_LIMIT_WINDOW_MS,
      max: API_RATE_LIMIT_MAX_REQUESTS,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  registerWorkoutRoutes(app);
  registerHistoryRoutes(app);
  registerAuthRoutes(app);
  registerDashboardRoutes(app);
  registerPageRoutes(app);

  return app;
}

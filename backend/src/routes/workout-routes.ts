import { Express } from "express";
import { generateWorkout } from "../agents.js";
import { createAuditMiddleware } from "../audit.js";
import { addWorkoutToHistory } from "../history.js";
import { logger } from "../logger.js";
import { generateWorkoutRateLimiter } from "../rate-limiters.js";
import { ClientProfile } from "../types.js";
import { profileSchema } from "../schemas.js";
import { respondValidationError } from "./route-helpers.js";

const WORKOUT_ROUTE = "/api/generate-workout";

export function registerWorkoutRoutes(app: Express): void {
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "workout-generator" });
  });

  app.post(WORKOUT_ROUTE, generateWorkoutRateLimiter, createAuditMiddleware("generate_workout"), async (req, res) => {
    const parsed = profileSchema.safeParse(req.body);

    if (!parsed.success) {
      return respondValidationError(
        req,
        res,
        WORKOUT_ROUTE,
        "generate_workout_validation_failed",
        parsed.error.flatten(),
      );
    }

    try {
      const profile = parsed.data as ClientProfile;
      const result = await generateWorkout(profile);

      if (req.clientId) {
        addWorkoutToHistory(req.clientId, profile, result);
      }

      logger.info("generate_workout_success", {
        route: WORKOUT_ROUTE,
        requestId: req.requestId,
        clientId: req.clientId,
        objetivo: profile.objetivo,
        diasSemana: profile.diasSemana,
      });

      return res.json(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isTimeout = errorMessage.includes("Timeout");
      const isProviderUnavailable = /503|service unavailable|temporarily unavailable|rate limit|429/i.test(errorMessage);
      const statusCode = isTimeout ? 504 : isProviderUnavailable ? 503 : 500;

      logger.error("generate_workout_failed", {
        route: WORKOUT_ROUTE,
        requestId: req.requestId,
        clientId: req.clientId,
        error: errorMessage,
        isTimeout,
      });

      const userMessage = isTimeout
        ? "A IA levou muito tempo para responder. Tente novamente em alguns instantes."
        : isProviderUnavailable
          ? "O provedor de IA está instável no momento (503/limite). Tente novamente em alguns instantes."
          : "Não foi possível gerar a ficha de treino no momento. Tente novamente mais tarde.";

      return res.status(statusCode).json({ error: userMessage });
    }
  });
}

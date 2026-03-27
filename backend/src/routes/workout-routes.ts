import { Express } from "express";
import { generateWorkout } from "../agents.js";
import { getGenerationReadiness } from "../agents.js";
import { createAuditMiddleware } from "../audit.js";
import { addWorkoutToHistory } from "../history.js";
import { logger } from "../logger.js";
import { generateWorkoutRateLimiter } from "../rate-limiters.js";
import { profileSchema } from "../schemas.js";
import { respondValidationError } from "./route-helpers.js";

const WORKOUT_ROUTE = "/api/generate-workout";

function classifyGenerateError(error: unknown): {
  statusCode: number;
  userMessage: string;
  isTimeout: boolean;
  errorMessage: string;
} {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const normalizedMessage = errorMessage.toLowerCase();
  const isTimeout = normalizedMessage.includes("timeout");
  const isProviderUnavailable = /503|service unavailable|temporarily unavailable|rate limit|429/.test(normalizedMessage);
  const statusCode = isTimeout ? 504 : isProviderUnavailable ? 503 : 500;

  const userMessage = isTimeout
    ? "A IA levou muito tempo para responder. Tente novamente em alguns instantes."
    : isProviderUnavailable
      ? "O provedor de IA está instável no momento (503/limite). Tente novamente em alguns instantes."
      : "Não foi possível gerar a ficha de treino no momento. Tente novamente mais tarde.";

  return {
    statusCode,
    userMessage,
    isTimeout,
    errorMessage,
  };
}

export function registerWorkoutRoutes(app: Express): void {
  app.get("/api/health", (_req, res) => {
    const readiness = getGenerationReadiness();

    res.json({
      ok: true,
      service: "workout-generator",
      ai: {
        configured: readiness.configured,
        providerPreference: readiness.providerPreference,
        availableProviders: readiness.availableProviders,
      },
    });
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
      const profile = parsed.data;
      const result = await generateWorkout(profile);
      const generationSource = result.generationMeta?.source || "unknown";

      res.setHeader("X-Generation-Source", generationSource);

      if (req.clientId) {
        addWorkoutToHistory(req.clientId, profile, result);
      }

      logger.info("generate_workout_success", {
        route: WORKOUT_ROUTE,
        requestId: req.requestId,
        clientId: req.clientId,
        objetivo: profile.objetivo,
        diasSemana: profile.diasSemana,
        generationSource,
      });

      return res.json(result);
    } catch (error) {
      const { errorMessage, isTimeout, statusCode, userMessage } = classifyGenerateError(error);

      logger.error("generate_workout_failed", {
        route: WORKOUT_ROUTE,
        requestId: req.requestId,
        clientId: req.clientId,
        error: errorMessage,
        isTimeout,
      });

      return res.status(statusCode).json({ error: userMessage });
    }
  });
}

import { Express } from "express";
import { generateWorkout } from "../agents.js";
import { createAuditMiddleware } from "../audit.js";
import { addWorkoutToHistory } from "../history.js";
import { logger } from "../logger.js";
import { generateWorkoutRateLimiter } from "../rate-limiters.js";
import { ClientProfile } from "../types.js";
import { profileSchema } from "../schemas.js";

export function registerWorkoutRoutes(app: Express): void {
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "workout-generator" });
  });

  app.post("/api/generate-workout", generateWorkoutRateLimiter, createAuditMiddleware("generate_workout"), async (req, res) => {
    const parsed = profileSchema.safeParse(req.body);

    if (!parsed.success) {
      logger.warn("generate_workout_validation_failed", {
        route: "/api/generate-workout",
        requestId: req.requestId,
        clientId: req.clientId,
      });

      return res.status(400).json({
        error: "Dados inválidos",
        issues: parsed.error.flatten(),
      });
    }

    try {
      const profile = parsed.data as ClientProfile;
      const result = await generateWorkout(profile);

      if (req.clientId) {
        addWorkoutToHistory(req.clientId, profile, result);
      }

      logger.info("generate_workout_success", {
        route: "/api/generate-workout",
        requestId: req.requestId,
        clientId: req.clientId,
        objetivo: profile.objetivo,
        diasSemana: profile.diasSemana,
      });

      return res.json(result);
    } catch (error) {
      logger.error("generate_workout_failed", {
        route: "/api/generate-workout",
        requestId: req.requestId,
        clientId: req.clientId,
        error: error instanceof Error ? error.message : String(error),
      });

      return res.status(500).json({ error: "Não foi possível gerar a ficha de treino no momento." });
    }
  });
}

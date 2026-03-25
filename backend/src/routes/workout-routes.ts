import { Express } from "express";
import { generateWorkout } from "../agents.js";
import { addWorkoutToHistory } from "../history.js";
import { ClientProfile } from "../types.js";
import { profileSchema } from "../schemas.js";

export function registerWorkoutRoutes(app: Express): void {
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "workout-generator" });
  });

  app.post("/api/generate-workout", async (req, res) => {
    const parsed = profileSchema.safeParse(req.body);

    if (!parsed.success) {
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

      return res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro interno";
      return res.status(500).json({ error: message });
    }
  });
}

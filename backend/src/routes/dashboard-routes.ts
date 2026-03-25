import { Express } from "express";
import { authMiddleware } from "../auth-middleware.js";
import { CLINICAL_RULES } from "../clinical-rules.js";
import { getClientHistory, syncClientHistory } from "../history.js";

export function registerDashboardRoutes(app: Express): void {
  app.get("/api/dashboard", authMiddleware, (req, res) => {
    if (!req.userId) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    const clientId = req.clientId;
    if (clientId && clientId !== req.userId) {
      const anonymousHistory = getClientHistory(clientId);
      if (anonymousHistory.entries.length > 0) {
        syncClientHistory(req.userId, anonymousHistory.entries);
      }
    }

    const history = getClientHistory(req.userId);
    return res.json({ history: history.entries, clinicalRules: CLINICAL_RULES });
  });
}

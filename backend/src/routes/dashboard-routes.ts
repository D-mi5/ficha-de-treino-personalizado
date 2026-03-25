import { Express } from "express";
import { createAuditMiddleware } from "../audit.js";
import { authMiddleware } from "../auth-middleware.js";
import { CLINICAL_RULES } from "../clinical-rules.js";
import { getClientHistory, syncClientHistory } from "../history.js";
import { logger } from "../logger.js";

export function registerDashboardRoutes(app: Express): void {
  app.get("/api/dashboard", authMiddleware, createAuditMiddleware("dashboard_access"), (req, res) => {
    if (!req.userId) {
      logger.warn("dashboard_unauthorized", { route: "/api/dashboard", requestId: req.requestId });
      return res.status(401).json({ error: "Não autenticado" });
    }

    const clientId = req.clientId;
    if (clientId && clientId !== req.userId) {
      const anonymousHistory = getClientHistory(clientId);
      if (anonymousHistory.entries.length > 0) {
        syncClientHistory(req.userId, anonymousHistory.entries);
        logger.info("dashboard_history_merged", {
          route: "/api/dashboard",
          requestId: req.requestId,
          fromClientId: clientId,
          toUserId: req.userId,
          mergedEntries: anonymousHistory.entries.length,
        });
      }
    }

    const history = getClientHistory(req.userId);
    logger.info("dashboard_fetched", {
      route: "/api/dashboard",
      requestId: req.requestId,
      userId: req.userId,
      entries: history.entries.length,
    });

    return res.json({ history: history.entries, clinicalRules: CLINICAL_RULES });
  });
}

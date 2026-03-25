import { Express } from "express";
import { createAuditMiddleware } from "../audit.js";
import { getClientHistory, syncClientHistory } from "../history.js";
import { logger } from "../logger.js";
import { historySyncSchema } from "../schemas.js";

export function registerHistoryRoutes(app: Express): void {
  app.get("/api/history", (req, res) => {
    if (!req.clientId) {
      logger.warn("history_missing_client_id", { route: "/api/history", requestId: req.requestId });
      return res.status(400).json({ error: "clientId inválido" });
    }

    const history = getClientHistory(req.clientId);
    logger.debug("history_fetched", {
      route: "/api/history",
      requestId: req.requestId,
      clientId: req.clientId,
      entries: history.entries.length,
    });

    return res.json(history);
  });

  app.post("/api/history/sync", createAuditMiddleware("history_sync"), (req, res) => {
    if (!req.clientId) {
      logger.warn("history_sync_missing_client_id", { route: "/api/history/sync", requestId: req.requestId });
      return res.status(400).json({ error: "clientId inválido" });
    }

    const parsed = historySyncSchema.safeParse(req.body);

    if (!parsed.success) {
      logger.warn("history_sync_validation_failed", {
        route: "/api/history/sync",
        requestId: req.requestId,
        clientId: req.clientId,
      });

      return res.status(400).json({
        error: "Dados inválidos",
        issues: parsed.error.flatten(),
      });
    }

    const entries = parsed.data.entries || [];
    const history = syncClientHistory(req.clientId, entries);
    logger.info("history_sync_success", {
      route: "/api/history/sync",
      requestId: req.requestId,
      clientId: req.clientId,
      receivedEntries: entries.length,
      mergedEntries: history.entries.length,
    });

    return res.json(history);
  });
}

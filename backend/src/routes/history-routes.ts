import { Express } from "express";
import { createAuditMiddleware } from "../audit.js";
import { getClientHistory, syncClientHistory } from "../history.js";
import { logger } from "../logger.js";
import { historySyncSchema } from "../schemas.js";
import { respondMissingClientId, respondValidationError } from "./route-helpers.js";

const HISTORY_ROUTE = "/api/history";
const HISTORY_SYNC_ROUTE = "/api/history/sync";

export function registerHistoryRoutes(app: Express): void {
  app.get(HISTORY_ROUTE, (req, res) => {
    if (!req.clientId) {
      return respondMissingClientId(req, res, HISTORY_ROUTE, "history_missing_client_id");
    }

    const history = getClientHistory(req.clientId);
    logger.debug("history_fetched", {
      route: HISTORY_ROUTE,
      requestId: req.requestId,
      clientId: req.clientId,
      entries: history.entries.length,
    });

    return res.json(history);
  });

  app.post(HISTORY_SYNC_ROUTE, createAuditMiddleware("history_sync"), (req, res) => {
    if (!req.clientId) {
      return respondMissingClientId(req, res, HISTORY_SYNC_ROUTE, "history_sync_missing_client_id");
    }

    const parsed = historySyncSchema.safeParse(req.body);

    if (!parsed.success) {
      return respondValidationError(
        req,
        res,
        HISTORY_SYNC_ROUTE,
        "history_sync_validation_failed",
        parsed.error.flatten(),
      );
    }

    const entries = parsed.data.entries || [];
    const history = syncClientHistory(req.clientId, entries);
    logger.info("history_sync_success", {
      route: HISTORY_SYNC_ROUTE,
      requestId: req.requestId,
      clientId: req.clientId,
      receivedEntries: entries.length,
      mergedEntries: history.entries.length,
    });

    return res.json(history);
  });
}

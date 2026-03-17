import { Express } from "express";
import { getClientHistory, syncClientHistory } from "../history.js";
import { historySyncSchema } from "../schemas.js";

export function registerHistoryRoutes(app: Express): void {
  app.get("/api/history", (req, res) => {
    if (!req.clientId) {
      return res.status(400).json({ error: "clientId inválido" });
    }

    const history = getClientHistory(req.clientId);
    return res.json(history);
  });

  app.post("/api/history/sync", (req, res) => {
    if (!req.clientId) {
      return res.status(400).json({ error: "clientId inválido" });
    }

    const parsed = historySyncSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: "Dados inválidos",
        issues: parsed.error.flatten(),
      });
    }

    const entries = parsed.data.entries || [];
    const history = syncClientHistory(req.clientId, entries);
    return res.json(history);
  });
}

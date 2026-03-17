import { Express } from "express";
import { authMiddleware } from "../auth-middleware.js";
import { getClientHistory } from "../history.js";

export function registerDashboardRoutes(app: Express): void {
  app.get("/api/dashboard", authMiddleware, (req, res) => {
    if (!req.userId) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    const history = getClientHistory(req.userId);
    return res.json({ history: history.entries });
  });
}

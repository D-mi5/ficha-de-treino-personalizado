import { Express } from "express";
import path from "node:path";
import { authMiddleware } from "../auth-middleware.js";

export function registerPageRoutes(app: Express): void {
  app.get("/form", (_req, res) => {
    res.sendFile(path.resolve("frontend/form.html"));
  });

  app.get("/resultado", (_req, res) => {
    res.sendFile(path.resolve("frontend/result.html"));
  });

  app.get("/entrar", (_req, res) => {
    res.sendFile(path.resolve("frontend/login.html"));
  });

  app.get("/dashboard", authMiddleware, (req, res) => {
    if (!req.userId) {
      return res.redirect("/entrar");
    }

    res.sendFile(path.resolve("frontend/dashboard.html"));
  });
}

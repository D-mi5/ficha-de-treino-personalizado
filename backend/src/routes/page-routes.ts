import { Express } from "express";
import path from "node:path";
import { authMiddleware } from "../auth-middleware.js";

const ROUTE_FORM = "/form";
const ROUTE_RESULTADO = "/resultado";
const ROUTE_ENTRAR = "/entrar";
const ROUTE_HISTORICO_OFFLINE = "/historico-offline";
const ROUTE_DASHBOARD = "/dashboard";

function resolveFrontendPage(fileName: string): string {
  return path.resolve(`frontend/${fileName}`);
}

export function registerPageRoutes(app: Express): void {
  app.get(ROUTE_FORM, (_req, res) => {
    res.sendFile(resolveFrontendPage("form.html"));
  });

  app.get(ROUTE_RESULTADO, (_req, res) => {
    res.sendFile(resolveFrontendPage("result.html"));
  });

  app.get(ROUTE_ENTRAR, (_req, res) => {
    res.sendFile(resolveFrontendPage("login.html"));
  });

  app.get(ROUTE_HISTORICO_OFFLINE, (_req, res) => {
    res.sendFile(resolveFrontendPage("offline-history.html"));
  });

  app.get(ROUTE_DASHBOARD, authMiddleware, (req, res) => {
    if (!req.userId) {
      return res.redirect(ROUTE_ENTRAR);
    }

    res.sendFile(resolveFrontendPage("dashboard.html"));
  });
}

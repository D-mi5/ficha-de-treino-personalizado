import { Request, Response } from "express";
import { logger } from "../logger.js";

interface ValidationIssues {
  fieldErrors: Record<string, string[] | undefined>;
  formErrors: string[];
}

function buildRouteLogContext(req: Request, route: string): {
  route: string;
  requestId: string | undefined;
  clientId?: string;
} {
  return {
    route,
    requestId: req.requestId,
    clientId: req.clientId,
  };
}

export function respondMissingClientId(req: Request, res: Response, route: string, event: string): Response {
  const { clientId: _clientId, ...logContext } = buildRouteLogContext(req, route);
  logger.warn(event, logContext);
  return res.status(400).json({ error: "clientId inválido" });
}

export function respondValidationError(
  req: Request,
  res: Response,
  route: string,
  event: string,
  issues: ValidationIssues,
): Response {
  logger.warn(event, buildRouteLogContext(req, route));

  return res.status(400).json({
    error: "Dados inválidos",
    issues,
  });
}

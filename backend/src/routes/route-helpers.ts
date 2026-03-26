import { Request, Response } from "express";
import { logger } from "../logger.js";

interface ValidationIssues {
  fieldErrors: Record<string, string[] | undefined>;
  formErrors: string[];
}

export function respondMissingClientId(req: Request, res: Response, route: string, event: string): Response {
  logger.warn(event, { route, requestId: req.requestId });
  return res.status(400).json({ error: "clientId inválido" });
}

export function respondValidationError(
  req: Request,
  res: Response,
  route: string,
  event: string,
  issues: ValidationIssues,
): Response {
  logger.warn(event, {
    route,
    requestId: req.requestId,
    clientId: req.clientId,
  });

  return res.status(400).json({
    error: "Dados inválidos",
    issues,
  });
}

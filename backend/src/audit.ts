import { NextFunction, Request, Response } from "express";
import { logger } from "./logger.js";

const USER_AGENT_MAX_LENGTH = 160;

type AuditLogLevel = "info" | "warn" | "error";

function truncateText(value: string | undefined, maxLength: number): string | undefined {
  if (!value) {
    return undefined;
  }

  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function getAuditLogLevel(statusCode: number): AuditLogLevel {
  if (statusCode >= 500) {
    return "error";
  }

  if (statusCode >= 400) {
    return "warn";
  }

  return "info";
}

export function createAuditMiddleware(event: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startedAt = Date.now();

    res.on("finish", () => {
      const durationMs = Date.now() - startedAt;
      const statusCode = res.statusCode;
      const context = {
        event,
        requestId: req.requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode,
        durationMs,
        clientId: req.clientId,
        userId: req.userId,
        email: typeof req.body?.email === "string" ? req.body.email : undefined,
        objetivo: typeof req.body?.objetivo === "string" ? req.body.objetivo : undefined,
        ip: req.ip,
        userAgent: truncateText(req.get("user-agent"), USER_AGENT_MAX_LENGTH),
      };
      const level = getAuditLogLevel(statusCode);

      if (level === "error") {
        logger.error("audit_event", context);
        return;
      }

      if (level === "warn") {
        logger.warn("audit_event", context);
        return;
      }

      logger.info("audit_event", context);
    });

    next();
  };
}

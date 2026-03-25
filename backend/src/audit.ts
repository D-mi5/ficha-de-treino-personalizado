import { NextFunction, Request, Response } from "express";
import { logger } from "./logger.js";

function truncateText(value: string | undefined, maxLength: number): string | undefined {
  if (!value) {
    return undefined;
  }

  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

export function createAuditMiddleware(event: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startedAt = Date.now();

    res.on("finish", () => {
      const durationMs = Date.now() - startedAt;
      const context = {
        event,
        requestId: req.requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs,
        clientId: req.clientId,
        userId: req.userId,
        email: typeof req.body?.email === "string" ? req.body.email : undefined,
        objetivo: typeof req.body?.objetivo === "string" ? req.body.objetivo : undefined,
        ip: req.ip,
        userAgent: truncateText(req.get("user-agent"), 160),
      };

      if (res.statusCode >= 500) {
        logger.error("audit_event", context);
        return;
      }

      if (res.statusCode >= 400) {
        logger.warn("audit_event", context);
        return;
      }

      logger.info("audit_event", context);
    });

    next();
  };
}

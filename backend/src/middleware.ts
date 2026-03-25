import crypto from "node:crypto";
import { Request, Response, NextFunction } from "express";
import { generateClientId } from "./history.js";

declare global {
  namespace Express {
    interface Request {
      clientId?: string;
      requestId?: string;
    }
  }
}

const COOKIE_NAME = "clientId";
const REQUEST_ID_HEADER = "X-Request-Id";

function resolveRequestId(headerValue: string | string[] | undefined): string {
  const incoming = Array.isArray(headerValue) ? headerValue[0] : headerValue;

  if (incoming && /^[a-zA-Z0-9._-]{8,120}$/.test(incoming)) {
    return incoming;
  }

  return crypto.randomUUID();
}

export function requestContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = resolveRequestId(req.headers[REQUEST_ID_HEADER.toLowerCase()]);

  req.requestId = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);
  next();
}

export function clientIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  let clientId = req.cookies?.[COOKIE_NAME];

  if (!clientId) {
    clientId = generateClientId();
    res.cookie(COOKIE_NAME, clientId, {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });
  }

  req.clientId = clientId;
  next();
}

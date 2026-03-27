import crypto from "node:crypto";
import { Request, Response, NextFunction } from "express";
import { generateClientId } from "./history.js";
import { CLIENT_COOKIE_NAME, CLIENT_COOKIE_OPTIONS, REQUEST_ID_HEADER } from "./http-constants.js";

declare global {
  namespace Express {
    interface Request {
      clientId?: string;
      requestId?: string;
    }
  }
}

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
  let clientId = req.cookies?.[CLIENT_COOKIE_NAME];

  if (!clientId) {
    clientId = generateClientId();
    res.cookie(CLIENT_COOKIE_NAME, clientId, CLIENT_COOKIE_OPTIONS);
  }

  req.clientId = clientId;
  next();
}

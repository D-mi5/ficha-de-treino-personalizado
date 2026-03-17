import { Request, Response, NextFunction } from "express";
import { generateClientId } from "./history.js";

declare global {
  namespace Express {
    interface Request {
      clientId?: string;
    }
  }
}

const COOKIE_NAME = "clientId";

export function clientIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  let clientId = req.cookies?.[COOKIE_NAME];

  if (!clientId) {
    clientId = generateClientId();
    res.cookie(COOKIE_NAME, clientId, {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias
      httpOnly: true,
      sameSite: "strict",
    });
  }

  req.clientId = clientId;
  next();
}

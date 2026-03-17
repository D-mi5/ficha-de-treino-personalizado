import { Request, Response, NextFunction } from "express";
import { validateSession } from "./auth.js";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

const AUTH_COOKIE_NAME = "sessionToken";

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[AUTH_COOKIE_NAME];

  if (!token) {
    return next();
  }

  const userId = validateSession(token);

  if (!userId) {
    res.clearCookie(AUTH_COOKIE_NAME);
    return next();
  }

  req.userId = userId;
  next();
}

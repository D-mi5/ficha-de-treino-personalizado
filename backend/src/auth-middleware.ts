import { Request, Response, NextFunction } from "express";
import { validateSession } from "./auth.js";
import { BASE_COOKIE_SECURITY_OPTIONS, SESSION_COOKIE_NAME } from "./http-constants.js";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

const AUTH_CLEAR_COOKIE_OPTIONS = BASE_COOKIE_SECURITY_OPTIONS;

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[SESSION_COOKIE_NAME];

  if (!token) {
    return next();
  }

  const userId = validateSession(token);

  if (!userId) {
    res.clearCookie(SESSION_COOKIE_NAME, AUTH_CLEAR_COOKIE_OPTIONS);
    return next();
  }

  req.userId = userId;
  next();
}

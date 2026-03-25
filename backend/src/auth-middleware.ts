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
const AUTH_CLEAR_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
};

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[AUTH_COOKIE_NAME];

  if (!token) {
    return next();
  }

  const userId = validateSession(token);

  if (!userId) {
    res.clearCookie(AUTH_COOKIE_NAME, AUTH_CLEAR_COOKIE_OPTIONS);
    return next();
  }

  req.userId = userId;
  next();
}

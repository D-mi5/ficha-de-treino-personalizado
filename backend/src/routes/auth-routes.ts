import { Express } from "express";
import { createAuditMiddleware } from "../audit.js";
import { authenticateUser, logoutSession, registerUser } from "../auth.js";
import { logger } from "../logger.js";
import { loginRateLimiter, registerRateLimiter } from "../rate-limiters.js";
import { authSchema } from "../schemas.js";

const SESSION_COOKIE_NAME = "sessionToken";
const SESSION_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: SESSION_COOKIE_MAX_AGE_MS,
};

const SESSION_CLEAR_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
};

export function registerAuthRoutes(app: Express): void {
  app.post("/api/auth/register", registerRateLimiter, createAuditMiddleware("auth_register"), (req, res) => {
    const parsed = authSchema.safeParse(req.body);

    if (!parsed.success) {
      logger.warn("auth_register_validation_failed", {
        route: "/api/auth/register",
        requestId: req.requestId,
      });

      return res.status(400).json({
        error: "E-mail e senha são obrigatórios",
        issues: parsed.error.flatten(),
      });
    }

    const { email, password } = parsed.data;
    const user = registerUser(email, password);

    if (!user) {
      logger.warn("auth_register_conflict", {
        route: "/api/auth/register",
        requestId: req.requestId,
        email,
      });

      return res.status(400).json({ error: "E-mail já registrado" });
    }

    const session = authenticateUser(email, password);

    if (!session) {
      logger.error("auth_register_session_creation_failed", {
        route: "/api/auth/register",
        requestId: req.requestId,
        email,
      });

      return res.status(500).json({ error: "Erro ao criar sessão" });
    }

    res.cookie(SESSION_COOKIE_NAME, session.token, SESSION_COOKIE_OPTIONS);

    logger.info("auth_register_success", {
      route: "/api/auth/register",
      requestId: req.requestId,
      email,
      userId: user.id,
    });

    return res.json({ email: user.email, userId: user.id });
  });

  app.post("/api/auth/login", loginRateLimiter, createAuditMiddleware("auth_login"), (req, res) => {
    const parsed = authSchema.safeParse(req.body);

    if (!parsed.success) {
      logger.warn("auth_login_validation_failed", {
        route: "/api/auth/login",
        requestId: req.requestId,
      });

      return res.status(400).json({
        error: "E-mail e senha são obrigatórios",
        issues: parsed.error.flatten(),
      });
    }

    const { email, password } = parsed.data;
    const session = authenticateUser(email, password);

    if (!session) {
      logger.warn("auth_login_failed", {
        route: "/api/auth/login",
        requestId: req.requestId,
        email,
      });

      return res.status(401).json({ error: "E-mail ou senha incorretos" });
    }

    res.cookie(SESSION_COOKIE_NAME, session.token, SESSION_COOKIE_OPTIONS);

    logger.info("auth_login_success", {
      route: "/api/auth/login",
      requestId: req.requestId,
      email,
      userId: session.userId,
    });

    return res.json({ email, userId: session.userId });
  });

  app.post("/api/auth/logout", createAuditMiddleware("auth_logout"), (req, res) => {
    const sessionToken = req.cookies?.[SESSION_COOKIE_NAME];
    if (sessionToken) {
      logoutSession(sessionToken);
    }

    res.clearCookie(SESSION_COOKIE_NAME, SESSION_CLEAR_COOKIE_OPTIONS);
    logger.info("auth_logout", {
      route: "/api/auth/logout",
      requestId: req.requestId,
      hasSessionToken: Boolean(sessionToken),
    });

    return res.json({ ok: true });
  });
}

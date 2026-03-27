import { Express, Request, Response } from "express";
import { createAuditMiddleware } from "../audit.js";
import { authenticateUser, logoutSession, registerUser } from "../auth.js";
import { BASE_COOKIE_SECURITY_OPTIONS, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from "../http-constants.js";
import { logger } from "../logger.js";
import { loginRateLimiter, registerRateLimiter } from "../rate-limiters.js";
import { authSchema } from "../schemas.js";

const AUTH_REGISTER_ROUTE = "/api/auth/register";
const AUTH_LOGIN_ROUTE = "/api/auth/login";
const AUTH_LOGOUT_ROUTE = "/api/auth/logout";
const SESSION_CLEAR_COOKIE_OPTIONS = BASE_COOKIE_SECURITY_OPTIONS;

interface AuthPayload {
  email: string;
  password: string;
}

function parseAuthPayload(
  req: Request,
  res: Response,
  route: string,
  validationEvent: string,
): AuthPayload | null {
  const parsed = authSchema.safeParse(req.body);

  if (!parsed.success) {
    logger.warn(validationEvent, {
      route,
      requestId: req.requestId,
    });

    res.status(400).json({
      error: "E-mail e senha são obrigatórios",
      issues: parsed.error.flatten(),
    });
    return null;
  }

  return parsed.data;
}

export function registerAuthRoutes(app: Express): void {
  app.post(AUTH_REGISTER_ROUTE, registerRateLimiter, createAuditMiddleware("auth_register"), (req, res) => {
    const payload = parseAuthPayload(req, res, AUTH_REGISTER_ROUTE, "auth_register_validation_failed");
    if (!payload) {
      return;
    }

    const { email, password } = payload;
    const user = registerUser(email, password);

    if (!user) {
      logger.warn("auth_register_conflict", {
        route: AUTH_REGISTER_ROUTE,
        requestId: req.requestId,
        email,
      });

      return res.status(400).json({ error: "E-mail já registrado" });
    }

    const session = authenticateUser(email, password);

    if (!session) {
      logger.error("auth_register_session_creation_failed", {
        route: AUTH_REGISTER_ROUTE,
        requestId: req.requestId,
        email,
      });

      return res.status(500).json({ error: "Erro ao criar sessão" });
    }

    res.cookie(SESSION_COOKIE_NAME, session.token, SESSION_COOKIE_OPTIONS);

    logger.info("auth_register_success", {
      route: AUTH_REGISTER_ROUTE,
      requestId: req.requestId,
      email,
      userId: user.id,
    });

    return res.json({ email: user.email, userId: user.id });
  });

  app.post(AUTH_LOGIN_ROUTE, loginRateLimiter, createAuditMiddleware("auth_login"), (req, res) => {
    const payload = parseAuthPayload(req, res, AUTH_LOGIN_ROUTE, "auth_login_validation_failed");
    if (!payload) {
      return;
    }

    const { email, password } = payload;
    const session = authenticateUser(email, password);

    if (!session) {
      logger.warn("auth_login_failed", {
        route: AUTH_LOGIN_ROUTE,
        requestId: req.requestId,
        email,
      });

      return res.status(401).json({ error: "E-mail ou senha incorretos" });
    }

    res.cookie(SESSION_COOKIE_NAME, session.token, SESSION_COOKIE_OPTIONS);

    logger.info("auth_login_success", {
      route: AUTH_LOGIN_ROUTE,
      requestId: req.requestId,
      email,
      userId: session.userId,
    });

    return res.json({ email, userId: session.userId });
  });

  app.post(AUTH_LOGOUT_ROUTE, createAuditMiddleware("auth_logout"), (req, res) => {
    const sessionToken = req.cookies?.[SESSION_COOKIE_NAME];
    if (sessionToken) {
      logoutSession(sessionToken);
    }

    res.clearCookie(SESSION_COOKIE_NAME, SESSION_CLEAR_COOKIE_OPTIONS);
    logger.info("auth_logout", {
      route: AUTH_LOGOUT_ROUTE,
      requestId: req.requestId,
      hasSessionToken: Boolean(sessionToken),
    });

    return res.json({ ok: true });
  });
}

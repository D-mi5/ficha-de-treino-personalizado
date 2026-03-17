import { Express } from "express";
import { authenticateUser, logoutSession, registerUser } from "../auth.js";
import { authSchema } from "../schemas.js";

const SESSION_COOKIE_NAME = "sessionToken";
const SESSION_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function registerAuthRoutes(app: Express): void {
  app.post("/api/auth/register", (req, res) => {
    const parsed = authSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: "E-mail e senha são obrigatórios",
        issues: parsed.error.flatten(),
      });
    }

    const { email, password } = parsed.data;
    const user = registerUser(email, password);

    if (!user) {
      return res.status(400).json({ error: "E-mail já registrado" });
    }

    const session = authenticateUser(email, password);

    if (!session) {
      return res.status(500).json({ error: "Erro ao criar sessão" });
    }

    res.cookie(SESSION_COOKIE_NAME, session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: SESSION_COOKIE_MAX_AGE_MS,
    });

    return res.json({ email: user.email, userId: user.id });
  });

  app.post("/api/auth/login", (req, res) => {
    const parsed = authSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: "E-mail e senha são obrigatórios",
        issues: parsed.error.flatten(),
      });
    }

    const { email, password } = parsed.data;
    const session = authenticateUser(email, password);

    if (!session) {
      return res.status(401).json({ error: "E-mail ou senha incorretos" });
    }

    res.cookie(SESSION_COOKIE_NAME, session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: SESSION_COOKIE_MAX_AGE_MS,
    });

    return res.json({ email, userId: session.userId });
  });

  app.post("/api/auth/logout", (req, res) => {
    const sessionToken = req.cookies?.[SESSION_COOKIE_NAME];
    if (sessionToken) {
      logoutSession(sessionToken);
    }

    res.clearCookie(SESSION_COOKIE_NAME);
    return res.json({ ok: true });
  });
}

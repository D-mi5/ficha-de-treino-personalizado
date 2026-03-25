import rateLimit from "express-rate-limit";
import { logger } from "./logger.js";

function buildRateLimiter(options: {
  windowMs: number;
  max: number;
  message: string;
  event: string;
}) {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn("rate_limit_triggered", {
        event: options.event,
        route: req.originalUrl,
        requestId: req.requestId,
        clientId: req.clientId,
        userId: req.userId,
        ip: req.ip,
      });

      res.status(429).json({ error: options.message });
    },
  });
}

export const registerRateLimiter = buildRateLimiter({
  event: "auth_register_rate_limit",
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Muitas tentativas de cadastro. Aguarde alguns minutos e tente novamente.",
});

export const loginRateLimiter = buildRateLimiter({
  event: "auth_login_rate_limit",
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: "Muitas tentativas de login. Aguarde alguns minutos e tente novamente.",
});

export const generateWorkoutRateLimiter = buildRateLimiter({
  event: "generate_workout_rate_limit",
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: "Muitas solicitações de ficha em sequência. Aguarde um instante e tente novamente.",
});

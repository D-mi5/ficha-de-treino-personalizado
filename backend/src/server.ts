import "dotenv/config";
import { createApp } from "./app.js";
import { validateRuntimeConfig } from "./config.js";
import { logger } from "./logger.js";

validateRuntimeConfig();

const app = createApp();
const PORT = Number(process.env.PORT || 3000);
const server = app.listen(PORT, () => {
  logger.info("server_started", { port: PORT, nodeEnv: process.env.NODE_ENV || "development" });
});

let isShuttingDown = false;
let forcedShutdownTimer: NodeJS.Timeout | undefined;

function shutdown(signal: NodeJS.Signals): void {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  logger.info("server_shutdown_started", { signal });

  forcedShutdownTimer = setTimeout(() => {
    logger.error("server_shutdown_forced", { signal });
    process.exit(1);
  }, 10_000);

  server.close((error) => {
    if (forcedShutdownTimer) {
      clearTimeout(forcedShutdownTimer);
      forcedShutdownTimer = undefined;
    }

    if (error) {
      logger.error("server_shutdown_failed", {
        signal,
        error: error.message,
      });
      process.exit(1);
      return;
    }

    logger.info("server_shutdown_completed", { signal });
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("unhandledRejection", (reason) => {
  logger.error("unhandled_rejection", {
    reason: reason instanceof Error ? reason.message : String(reason),
  });
});

process.on("uncaughtException", (error) => {
  logger.error("uncaught_exception", {
    error: error.message,
    stack: error.stack,
  });
});

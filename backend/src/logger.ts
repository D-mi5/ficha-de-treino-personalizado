type LogLevel = "debug" | "info" | "warn" | "error";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
interface JsonObject {
  [key: string]: JsonValue;
}

const SENSITIVE_KEY_PATTERN = /(password|passwd|token|authorization|cookie|api[-_]?key|secret|session)/i;

function toSafeString(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function maskEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const [local, domain] = trimmed.split("@");

  if (!local || !domain) {
    return "***";
  }

  if (local.length <= 2) {
    return `***@${domain}`;
  }

  return `${local.slice(0, 2)}***@${domain}`;
}

function maskString(raw: string): string {
  if (!raw) {
    return "***";
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailPattern.test(raw)) {
    return maskEmail(raw);
  }

  if (raw.length <= 6) {
    return "***";
  }

  return `${raw.slice(0, 2)}***${raw.slice(-2)}`;
}

function sanitizeValue(value: unknown): JsonValue {
  if (value == null) {
    return null;
  }

  if (typeof value === "string") {
    return value.length > 800 ? `${value.slice(0, 800)}...` : value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => sanitizeValue(item));
  }

  if (typeof value === "object") {
    const output: JsonObject = {};

    Object.entries(value as Record<string, unknown>).forEach(([key, entryValue]) => {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        if (typeof entryValue === "boolean" || typeof entryValue === "number" || entryValue == null) {
          output[key] = sanitizeValue(entryValue);
          return;
        }

        output[key] = maskString(toSafeString(entryValue));
        return;
      }

      if (key.toLowerCase() === "email" && typeof entryValue === "string") {
        output[key] = maskEmail(entryValue);
        return;
      }

      output[key] = sanitizeValue(entryValue);
    });

    return output;
  }

  return toSafeString(value);
}

function serializeLog(level: LogLevel, message: string, context?: Record<string, unknown>): string {
  const payload: JsonObject = {
    ts: new Date().toISOString(),
    level,
    msg: message,
  };

  if (context && Object.keys(context).length > 0) {
    payload.ctx = sanitizeValue(context);
  }

  return JSON.stringify(payload);
}

function emit(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  const line = serializeLog(level, message, context);

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}

export const logger = {
  debug(message: string, context?: Record<string, unknown>): void {
    if (process.env.LOG_LEVEL === "debug") {
      emit("debug", message, context);
    }
  },
  info(message: string, context?: Record<string, unknown>): void {
    emit("info", message, context);
  },
  warn(message: string, context?: Record<string, unknown>): void {
    emit("warn", message, context);
  },
  error(message: string, context?: Record<string, unknown>): void {
    emit("error", message, context);
  },
};

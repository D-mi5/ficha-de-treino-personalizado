const IS_PRODUCTION = process.env.NODE_ENV === "production";

export const REQUEST_ID_HEADER = "X-Request-Id";
export const CLIENT_COOKIE_NAME = "clientId";
export const SESSION_COOKIE_NAME = "sessionToken";
export const SESSION_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export const CLIENT_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export const BASE_COOKIE_SECURITY_OPTIONS = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: IS_PRODUCTION,
};

export const SESSION_COOKIE_OPTIONS = {
  ...BASE_COOKIE_SECURITY_OPTIONS,
  maxAge: SESSION_COOKIE_MAX_AGE_MS,
};

export const CLIENT_COOKIE_OPTIONS = {
  ...BASE_COOKIE_SECURITY_OPTIONS,
  maxAge: CLIENT_COOKIE_MAX_AGE_MS,
};

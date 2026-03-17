import crypto from "node:crypto";

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export interface Session {
  token: string;
  userId: string;
  expiresAt: string;
}

// Armazenamento em memória (pode migrar para DB)
const usersStore = new Map<string, User>();
const sessionsStore = new Map<string, Session>();

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function registerUser(email: string, password: string): User | null {
  const normalizedEmail = normalizeEmail(email);

  if (usersStore.has(normalizedEmail)) {
    return null; // Usuário já existe
  }

  const user: User = {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };

  usersStore.set(normalizedEmail, user);
  return user;
}

export function authenticateUser(email: string, password: string): Session | null {
  const normalizedEmail = normalizeEmail(email);
  const user = usersStore.get(normalizedEmail);

  if (!user || user.passwordHash !== hashPassword(password)) {
    return null;
  }

  const token = generateToken();
  const session: Session = {
    token,
    userId: user.id,
    expiresAt: new Date(Date.now() + SESSION_DURATION_MS).toISOString(),
  };

  sessionsStore.set(token, session);
  return session;
}

export function validateSession(token: string): string | null {
  const session = sessionsStore.get(token);

  if (!session) {
    return null;
  }

  if (new Date(session.expiresAt) < new Date()) {
    sessionsStore.delete(token);
    return null;
  }

  return session.userId;
}

export function logoutSession(token: string): void {
  sessionsStore.delete(token);
}

export function getUserById(userId: string): User | null {
  for (const user of usersStore.values()) {
    if (user.id === userId) {
      return user;
    }
  }
  return null;
}

import crypto from "node:crypto";
import { ClientProfile, WorkoutResponse } from "./types.js";

interface WorkoutHistoryEntry {
  id: string;
  createdAt: string;
  payload: ClientProfile;
  result: WorkoutResponse;
}

interface SyncHistoryEntryInput {
  id: string;
  createdAt: string;
  payload: ClientProfile & Record<string, unknown>;
  result: WorkoutResponse | Record<string, unknown>;
}

type HistoryMergeEntry = WorkoutHistoryEntry | SyncHistoryEntryInput;

interface ClientHistory {
  clientId: string;
  entries: WorkoutHistoryEntry[];
  lastSync: string;
}

// Armazenamento em memória (pode ser migrado para DB)
const historyStore = new Map<string, ClientHistory>();

const HISTORY_LIMIT = 10;

function nowIso(): string {
  return new Date().toISOString();
}

function trimHistoryLimit(entries: WorkoutHistoryEntry[]): WorkoutHistoryEntry[] {
  return entries.slice(0, HISTORY_LIMIT);
}

function persistClientHistory(history: ClientHistory): void {
  history.lastSync = nowIso();
  historyStore.set(history.clientId, history);
}

function mergeHistoryById(
  serverEntries: WorkoutHistoryEntry[],
  localEntries: HistoryMergeEntry[],
): HistoryMergeEntry[] {
  const merged = new Map<string, HistoryMergeEntry>();

  serverEntries.forEach((entry) => {
    merged.set(entry.id, entry);
  });

  localEntries.forEach((entry) => {
    if (!merged.has(entry.id)) {
      merged.set(entry.id, entry);
    }
  });

  return Array.from(merged.values());
}

function getWorkoutPlanSignature(workoutPlan: unknown): string {
  if (typeof workoutPlan === "string") {
    return workoutPlan.trim();
  }

  try {
    return JSON.stringify(workoutPlan);
  } catch {
    return String(workoutPlan || "");
  }
}

function isWorkoutResponseLike(value: unknown): value is WorkoutResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const analysis = candidate.analysis;

  return (
    (typeof candidate.workoutPlan === "string" || typeof candidate.workoutPlan === "object")
    && Boolean(analysis && typeof analysis === "object")
  );
}

function normalizeHistoryEntry(entry: HistoryMergeEntry): WorkoutHistoryEntry | null {
  if (!isWorkoutResponseLike(entry.result)) {
    return null;
  }

  return {
    id: entry.id,
    createdAt: entry.createdAt,
    payload: entry.payload,
    result: entry.result,
  };
}

export function generateClientId(): string {
  return `client-${crypto.randomUUID()}`;
}

export function getClientHistory(clientId: string): ClientHistory {
  if (!historyStore.has(clientId)) {
    historyStore.set(clientId, {
      clientId,
      entries: [],
      lastSync: nowIso(),
    });
  }

  return historyStore.get(clientId)!;
}

export function addWorkoutToHistory(
  clientId: string,
  payload: ClientProfile,
  result: WorkoutResponse,
): WorkoutHistoryEntry {
  const history = getClientHistory(clientId);

  const newEntry: WorkoutHistoryEntry = {
    id: crypto.randomUUID(),
    createdAt: nowIso(),
    payload,
    result,
  };

  // Remover duplicatas baseado no plano de treino
  const newSignature = getWorkoutPlanSignature(result.workoutPlan);
  history.entries = history.entries.filter((e) => getWorkoutPlanSignature(e.result.workoutPlan) !== newSignature);

  // Adicionar novo entry no começo
  history.entries.unshift(newEntry);

  history.entries = trimHistoryLimit(history.entries);
  persistClientHistory(history);

  return newEntry;
}

export function syncClientHistory(
  clientId: string,
  localEntries: HistoryMergeEntry[],
): ClientHistory {
  const serverHistory = getClientHistory(clientId);
  const mergedEntries = mergeHistoryById(serverHistory.entries, localEntries);

  // Converter de volta para array, ordenar por data e limitar
  const allEntries = mergedEntries.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  serverHistory.entries = allEntries
    .map((entry) => normalizeHistoryEntry(entry))
    .filter((entry): entry is WorkoutHistoryEntry => Boolean(entry))
    .slice(0, HISTORY_LIMIT);
  persistClientHistory(serverHistory);

  return serverHistory;
}

export function deleteClientHistory(clientId: string): void {
  historyStore.delete(clientId);
}

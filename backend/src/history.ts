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
  payload: Record<string, unknown>;
  result: Record<string, unknown>;
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

export function generateClientId(): string {
  return `client-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getClientHistory(clientId: string): ClientHistory {
  if (!historyStore.has(clientId)) {
    historyStore.set(clientId, {
      clientId,
      entries: [],
      lastSync: new Date().toISOString(),
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
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    payload,
    result,
  };

  // Remover duplicatas baseado no plano de treino
  history.entries = history.entries.filter((e) => e.result.workoutPlan !== result.workoutPlan);

  // Adicionar novo entry no começo
  history.entries.unshift(newEntry);

  // Limitar ao histórico máximo
  if (history.entries.length > HISTORY_LIMIT) {
    history.entries = history.entries.slice(0, HISTORY_LIMIT);
  }

  history.lastSync = new Date().toISOString();
  historyStore.set(clientId, history);

  return newEntry;
}

export function syncClientHistory(
  clientId: string,
  localEntries: HistoryMergeEntry[],
): ClientHistory {
  const serverHistory = getClientHistory(clientId);

  // Mesclar históricos: manter entries únicas por ID
  const merged = new Map<string, HistoryMergeEntry>();

  // Adicionar histórico do servidor
  serverHistory.entries.forEach((entry) => {
    merged.set(entry.id, entry);
  });

  // Adicionar histórico do cliente (sobrescreve se ID existir)
  localEntries.forEach((entry) => {
    if (!merged.has(entry.id)) {
      merged.set(entry.id, entry);
    }
  });

  // Converter de volta para array, ordenar por data e limitar
  const allEntries = Array.from(merged.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  serverHistory.entries = allEntries.slice(0, HISTORY_LIMIT) as WorkoutHistoryEntry[];
  serverHistory.lastSync = new Date().toISOString();
  historyStore.set(clientId, serverHistory);

  return serverHistory;
}

export function deleteClientHistory(clientId: string): void {
  historyStore.delete(clientId);
}

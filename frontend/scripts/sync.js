/**
 * Módulo de sincronização de histórico between local storage e servidor.
 */

const LOCAL_HISTORY_KEY = "workoutHistory";
const SYNC_DEBOUNCE_MS = 1000;
const HISTORY_ENDPOINT = "/api/history";
const HISTORY_SYNC_ENDPOINT = "/api/history/sync";

const JSON_POST_OPTIONS = {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
};

let syncTimeout = null;

function isOnline() {
  return navigator.onLine;
}

function normalizeHistoryArray(value) {
  return Array.isArray(value) ? value : [];
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    return null;
  }

  return response.json();
}

function mergeHistoryById(serverHistory, localHistory) {
  const merged = new Map();

  normalizeHistoryArray(serverHistory).forEach((entry) => {
    merged.set(entry.id, entry);
  });

  normalizeHistoryArray(localHistory).forEach((entry) => {
    if (!merged.has(entry.id)) {
      merged.set(entry.id, entry);
    }
  });

  return Array.from(merged.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function getLocalHistory() {
  try {
    const raw = localStorage.getItem(LOCAL_HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return normalizeHistoryArray(parsed);
  } catch {
    return [];
  }
}

export function saveLocalHistory(history) {
  localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(history));
}

export async function fetchServerHistory() {
  if (!isOnline()) {
    return null;
  }

  try {
    const data = await requestJson(HISTORY_ENDPOINT);
    if (!data) {
      return null;
    }

    return normalizeHistoryArray(data.entries);
  } catch {
    return null;
  }
}

export async function syncHistoryWithServer(localHistory) {
  if (!isOnline()) {
    return false;
  }

  try {
    const serverHistory = await requestJson(HISTORY_SYNC_ENDPOINT, {
      ...JSON_POST_OPTIONS,
      body: JSON.stringify({
        entries: localHistory,
      }),
    });

    if (!serverHistory) {
      return false;
    }

    // Atualizar local com versão merged do servidor
    const normalizedEntries = normalizeHistoryArray(serverHistory.entries);
    if (normalizedEntries.length > 0) {
      saveLocalHistory(normalizedEntries);
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export function debouncedSync(localHistory) {
  clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    syncHistoryWithServer(localHistory);
  }, SYNC_DEBOUNCE_MS);
}

export async function loadMergedHistory() {
  const localHistory = getLocalHistory();

  if (!isOnline()) {
    return localHistory;
  }

  const serverHistory = await fetchServerHistory();
  if (!serverHistory) {
    return localHistory;
  }

  const result = mergeHistoryById(serverHistory, localHistory);

  saveLocalHistory(result);
  return result;
}

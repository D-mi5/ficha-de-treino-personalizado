/**
 * Módulo de sincronização de histórico between local storage e servidor.
 */

const LOCAL_HISTORY_KEY = "workoutHistory";
const SYNC_DEBOUNCE_MS = 1000;

let syncTimeout = null;

export function getLocalHistory() {
  try {
    const raw = localStorage.getItem(LOCAL_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalHistory(history) {
  localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(history));
}

export async function fetchServerHistory() {
  if (!navigator.onLine) {
    return null;
  }

  try {
    const response = await fetch("/api/history");
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    return data.entries || [];
  } catch {
    return null;
  }
}

export async function syncHistoryWithServer(localHistory) {
  if (!navigator.onLine) {
    return false;
  }

  try {
    const response = await fetch("/api/history/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        entries: localHistory,
      }),
    });

    if (!response.ok) {
      return false;
    }

    const serverHistory = await response.json();

    // Atualizar local com versão merged do servidor
    if (serverHistory.entries) {
      saveLocalHistory(serverHistory.entries);
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

  if (!navigator.onLine) {
    return localHistory;
  }

  const serverHistory = await fetchServerHistory();
  if (!serverHistory) {
    return localHistory;
  }

  // Mesclar mantendo apenas as únicas por ID
  const merged = new Map();

  serverHistory.forEach((entry) => {
    merged.set(entry.id, entry);
  });

  localHistory.forEach((entry) => {
    if (!merged.has(entry.id)) {
      merged.set(entry.id, entry);
    }
  });

  const result = Array.from(merged.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  saveLocalHistory(result);
  return result;
}

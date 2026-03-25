const loadingEl = document.getElementById("loading");
const resultEl = document.getElementById("result");
const errorEl = document.getElementById("error");
const contentEl = document.getElementById("workout-content");
const imcEl = document.getElementById("imc-value");
const intensityEl = document.getElementById("intensity-value");
const progressionEl = document.getElementById("progression-value");
const loadingTextEl = document.getElementById("loading-text");
const errorMessageEl = document.getElementById("error-message");
const retryRequestEl = document.getElementById("retry-request");
const networkStatusEl = document.getElementById("network-status");
const historySectionEl = document.getElementById("history-section");
const historyListEl = document.getElementById("history-list");
const clearHistoryEl = document.getElementById("clear-history");

const HISTORY_KEY = "workoutHistory";
const HISTORY_LIMIT = 5;

// Importar funções de sincronização
const syncModule = (() => {
  const LOCAL_HISTORY_KEY = "workoutHistory";
  const SYNC_DEBOUNCE_MS = 1000;
  let syncTimeout = null;

  function getLocalHistory() {
    try {
      const raw = localStorage.getItem(LOCAL_HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveLocalHistory(history) {
    localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(history));
  }

  async function fetchServerHistory() {
    if (!navigator.onLine) {
      return null;
    }
    try {
      const data = await window.apiClient.getHistory();
      return data.entries || [];
    } catch {
      return null;
    }
  }

  async function syncHistoryWithServer(localHistory) {
    if (!navigator.onLine) return false;
    try {
      const serverHistory = await window.apiClient.syncHistory(localHistory);
      if (serverHistory.entries) {
        saveLocalHistory(serverHistory.entries);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async function loadMergedHistory() {
    const localHistory = getLocalHistory();
    if (!navigator.onLine) return localHistory;
    const serverHistory = await fetchServerHistory();
    if (!serverHistory) return localHistory;
    const merged = new Map();
    serverHistory.forEach((entry) => merged.set(entry.id, entry));
    localHistory.forEach((entry) => {
      if (!merged.has(entry.id)) merged.set(entry.id, entry);
    });
    const result = Array.from(merged.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    saveLocalHistory(result);
    return result;
  }

  return {
    getLocalHistory,
    saveLocalHistory,
    fetchServerHistory,
    syncHistoryWithServer,
    loadMergedHistory,
  };
})();

let lastPayload = null;
let lastResult = null;
let isRequestInFlight = false;
let hasPendingWorkoutRequest = false;

function createHistoryId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getStoredPayload() {
  try {
    const raw = localStorage.getItem("workoutPayload");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getStoredResult() {
  try {
    const raw = localStorage.getItem("workoutResult");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getHistory() {
  return syncModule.getLocalHistory();
}

function saveHistory(history) {
  syncModule.saveLocalHistory(history.slice(0, HISTORY_LIMIT));
  // Sincronizar com servidor em background
  syncModule.syncHistoryWithServer(history.slice(0, HISTORY_LIMIT));
}

function saveWorkoutToHistory(payload, result) {
  const history = getHistory();
  const item = {
    id: createHistoryId(),
    createdAt: new Date().toISOString(),
    payload,
    result,
  };

  const deduped = history.filter((entry) => entry?.result?.workoutPlan !== result.workoutPlan);
  const updated = [item, ...deduped];
  saveHistory(updated);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizePlanText(workoutPlan) {
  return String(workoutPlan || "")
    .replace(/\r/g, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/^\s*[-•]\s*/gm, "")
    .trim();
}

function extractWorkoutRows(workoutPlan) {
  const normalized = normalizePlanText(workoutPlan);
  const lines = normalized.split("\n").map((line) => line.trim()).filter(Boolean);
  const rows = [];

  let currentBlock = "Treino";

  for (const line of lines) {
    const blockMatch = line.match(/^treino\s*([A-D])/i);
    if (blockMatch) {
      currentBlock = `Treino ${blockMatch[1].toUpperCase()}`;
      continue;
    }

    const rowMatch = line.match(
      /^\s*(?:\d+[\).:-]\s*)?(.+?)\s*[:\-–]\s*(\d+\s*(?:s[eé]ries?)?\s*[xX]\s*\d+(?:\s*a\s*\d+|\s*-\s*\d+)?(?:\s*repeti[cç][õo]es?)?)(?:\s*\(([^)]+)\))?\s*$/i,
    );

    if (!rowMatch) {
      continue;
    }

    const exercicio = rowMatch[1].replace(/\s+/g, " ").trim();
    const seriesReps = rowMatch[2].replace(/\s+/g, " ").trim();
    const grupoMuscular = rowMatch[3]?.replace(/\s+/g, " ").trim() || "-";

    if (exercicio.length < 3) {
      continue;
    }

    rows.push({
      bloco: currentBlock,
      exercicio,
      seriesReps,
      grupoMuscular,
    });
  }

  return rows;
}

function extractAdviceItems(workoutPlan) {
  const normalized = normalizePlanText(workoutPlan);
  const lines = normalized.split("\n").map((line) => line.trim()).filter(Boolean);
  const advice = [];

  let insideAdviceSection = false;

  for (const line of lines) {
    if (/^\d+\)\s*dicas?|^dicas\s*finais/i.test(line)) {
      insideAdviceSection = true;
      continue;
    }

    if (insideAdviceSection && /^\d+\)/.test(line)) {
      const content = line.replace(/^\d+\)\s*/, "").trim();
      if (content) {
        advice.push(content);
      }
      continue;
    }

    if (insideAdviceSection && /^treino\s*[A-D]/i.test(line)) {
      insideAdviceSection = false;
    }
  }

  if (advice.length > 0) {
    return advice.slice(0, 6);
  }

  return lines
    .filter((line) => /^\d+\)/.test(line))
    .map((line) => line.replace(/^\d+\)\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 4);
}



function renderWorkoutContent(workoutPlan) {
  const workoutRows = extractWorkoutRows(workoutPlan);
  const adviceItems = extractAdviceItems(workoutPlan);
  const normalizedPlan = normalizePlanText(workoutPlan);

  if (workoutRows.length === 0) {
    return `
      <section class="rounded-2xl border border-white/20 bg-black/20 p-4 md:p-5">
        <h3 class="text-sm font-bold uppercase tracking-[0.18em] text-neonYellow">Plano detalhado</h3>
        <pre class="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-white/90">${escapeHtml(normalizedPlan)}</pre>
      </section>
    `;
  }

  const rowsByBlock = workoutRows.reduce((acc, row) => {
    if (!acc[row.bloco]) {
      acc[row.bloco] = [];
    }

    acc[row.bloco].push(row);
    return acc;
  }, {});

  const sortedBlockNames = Object.keys(rowsByBlock).sort((a, b) => a.localeCompare(b));

  const blockTablesHtml = sortedBlockNames
    .map((blockName) => {
      const blockRowsHtml = rowsByBlock[blockName]
        .map(
          (row) => `
            <tr>
              <td>${escapeHtml(row.exercicio)}</td>
              <td>${escapeHtml(row.seriesReps)}</td>
              <td>${escapeHtml(row.grupoMuscular)}</td>
            </tr>
          `,
        )
        .join("");

      return `
        <section class="workout-block">
          <h4 class="workout-block-title">${escapeHtml(blockName)}</h4>
          <div class="workout-table-wrap mt-2">
            <table class="workout-table">
              <thead>
                <tr>
                  <th>Exercício</th>
                  <th>Séries x Repetições</th>
                  <th>Grupo Muscular</th>
                </tr>
              </thead>
              <tbody>${blockRowsHtml}</tbody>
            </table>
          </div>
        </section>
      `;
    })
    .join("");

  const adviceHtml =
    adviceItems.length > 0
      ? `
        <section class="rounded-2xl border border-white/20 bg-black/20 p-4 md:p-5">
          <h3 class="text-sm font-bold uppercase tracking-[0.18em] text-neonGreen">Dicas e observações adicionais</h3>
          <div class="advice-grid mt-3">
            ${adviceItems.map((item) => `<article class="advice-card">${escapeHtml(item)}</article>`).join("")}
          </div>
        </section>
      `
      : "";

  return `
    <section class="rounded-2xl border border-white/20 bg-black/20 p-4 md:p-5">
      <h3 class="text-sm font-bold uppercase tracking-[0.18em] text-neonYellow">Treino em tabela</h3>
      <div class="mt-3 space-y-4">${blockTablesHtml}</div>
    </section>
    ${adviceHtml}
  `;
}

function renderWorkoutResult(data) {
  if (contentEl) {
    contentEl.innerHTML = renderWorkoutContent(data.workoutPlan);
  }

  if (imcEl) {
    imcEl.textContent = `${data.analysis.imc} (${data.analysis.classificacaoImc})`;
  }

  if (intensityEl) {
    intensityEl.textContent = data.analysis.intensidadeSugerida;
  }

  if (progressionEl) {
    progressionEl.textContent = data.analysis.progressaoSemanal;
  }

  loadingEl?.classList.add("hidden");
  errorEl?.classList.add("hidden");
  resultEl?.classList.remove("hidden");
  resultEl?.focus();
}

function openHistoryItem(itemId) {
  const history = getHistory();
  const selected = history.find((entry) => entry.id === itemId);
  if (!selected) {
    return;
  }

  lastPayload = selected.payload;
  lastResult = selected.result;
  renderWorkoutResult(selected.result);
}

function renderHistoryList() {
  if (!historySectionEl || !historyListEl) {
    return;
  }

  const history = getHistory();
  if (history.length === 0) {
    historySectionEl.classList.add("hidden");
    historyListEl.innerHTML = "";
    return;
  }

  historySectionEl.classList.remove("hidden");
  historyListEl.innerHTML = history
    .map((item) => {
      const dateLabel = escapeHtml(new Date(item.createdAt).toLocaleString("pt-BR"));
      const objetivo = escapeHtml(item?.payload?.objetivo || "-");
      const dias = escapeHtml(item?.payload?.diasSemana || "-");
      const safeId = escapeHtml(item.id);

      return `
        <article class="rounded-xl border border-white/20 bg-black/20 p-4">
          <p class="text-xs uppercase tracking-[0.2em] text-white/65">${dateLabel}</p>
          <p class="mt-2 text-sm text-white/90">Objetivo: <strong>${objetivo}</strong></p>
          <p class="text-sm text-white/90">Dias/semana: <strong>${dias}</strong></p>
          <button data-history-id="${safeId}" class="mt-3 w-full rounded-lg border border-neonGreen/60 px-3 py-2 text-sm font-semibold text-neonGreen sm:w-auto">
            Abrir ficha salva
          </button>
        </article>
      `;
    })
    .join("");

  historyListEl.querySelectorAll("[data-history-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const itemId = button.getAttribute("data-history-id");
      if (itemId) {
        openHistoryItem(itemId);
      }
    });
  });
}

function renderNetworkStatus() {
  if (!networkStatusEl) {
    return;
  }

  if (navigator.onLine) {
    networkStatusEl.className = "glow-panel p-4 text-sm font-semibold border border-neonGreen/45 bg-neonGreen/10 text-neonGreen";
    networkStatusEl.textContent = "Conexão restabelecida. Perfeito, vamos continuar.";

    setTimeout(() => {
      networkStatusEl.classList.add("hidden");
    }, 2800);

    return;
  }

  networkStatusEl.className = "glow-panel p-4 text-sm font-semibold border border-red-300/60 bg-red-900/25 text-red-200";
  networkStatusEl.textContent = "Você está sem internet no momento. Tentaremos novamente assim que a conexão voltar.";
  networkStatusEl.classList.remove("hidden");
}

async function requestWorkout() {
  if (isRequestInFlight) {
    return;
  }

  isRequestInFlight = true;
  retryRequestEl?.setAttribute("disabled", "true");
  retryRequestEl?.classList.add("is-loading");
  if (retryRequestEl) {
    retryRequestEl.textContent = "Tentando novamente...";
  }

  try {
    const rawPayload = localStorage.getItem("workoutPayload");

    if (!rawPayload) {
      throw new Error("Dados não encontrados no navegador.");
    }

    const payload = JSON.parse(rawPayload);
    lastPayload = payload;

    if (!navigator.onLine) {
      throw new Error("OFFLINE");
    }

    const data = await window.apiClient.generateWorkout(payload);

    lastResult = data;
    hasPendingWorkoutRequest = false;
    saveWorkoutToHistory(payload, data);
    renderHistoryList();
    renderWorkoutResult(data);
  } catch (error) {
    console.error(error);

    const isOfflineError = !navigator.onLine || (error instanceof Error && error.message === "OFFLINE");

    if (isOfflineError) {
      hasPendingWorkoutRequest = true;
      const history = getHistory();

      if (history.length > 0) {
        const latest = history[0];
        lastPayload = latest.payload;
        lastResult = latest.result;
        renderWorkoutResult(latest.result);
      }

      loadingEl?.classList.remove("hidden");
      if (loadingTextEl) {
        loadingTextEl.textContent = "Sem internet. Vamos gerar seu plano automaticamente quando a conexão voltar...";
      }
      errorEl?.classList.add("hidden");
      renderNetworkStatus();
      renderHistoryList();
      return;
    }

    loadingEl?.classList.add("hidden");
    errorEl?.classList.remove("hidden");

    if (errorMessageEl) {
      errorMessageEl.textContent = "Não foi possível gerar seu plano agora. Revise os dados e tente novamente.";
    }
  } finally {
    isRequestInFlight = false;
    retryRequestEl?.removeAttribute("disabled");
    retryRequestEl?.classList.remove("is-loading");
    if (retryRequestEl) {
      retryRequestEl.textContent = "Tentar novamente";
    }
  }
}

window.addEventListener("offline", () => {
  renderNetworkStatus();
});

window.addEventListener("online", async () => {
  renderNetworkStatus();

  if (hasPendingWorkoutRequest) {
    if (loadingTextEl) {
      loadingTextEl.textContent = "Conexão detectada. Estamos gerando seu plano agora...";
    }
    await requestWorkout();
  } else {
    // Sincronizar histórico quando voltar online
    const localHistory = getHistory();
    if (localHistory.length > 0) {
      await syncModule.syncHistoryWithServer(localHistory);
      renderHistoryList();
    }
  }
});

retryRequestEl?.addEventListener("click", () => {
  loadingEl?.classList.remove("hidden");
  errorEl?.classList.add("hidden");

  if (loadingTextEl) {
    loadingTextEl.textContent = "Gerando seu plano personalizado...";
  }

  requestWorkout();
});

clearHistoryEl?.addEventListener("click", () => {
  if (!window.confirm("Deseja realmente limpar o histórico offline desta tela?")) {
    return;
  }

  localStorage.removeItem(HISTORY_KEY);
  renderHistoryList();
});

renderHistoryList();

// Carregar histórico merged (local + servidor) na inicialização
syncModule.loadMergedHistory().then(() => {
  renderHistoryList();
});

lastPayload = getStoredPayload();
lastResult = getStoredResult();

if (lastResult) {
  renderWorkoutResult(lastResult);
} else if (lastPayload) {
  requestWorkout();
} else {
  loadingEl?.classList.add("hidden");
  errorEl?.classList.remove("hidden");
  if (errorMessageEl) {
    errorMessageEl.textContent = "Nenhuma ficha pronta foi encontrada. Preencha o formulário para gerar seu plano.";
  }
}

const loadingEl = document.getElementById("loading");
const contentEl = document.getElementById("content");
const unauthorizedEl = document.getElementById("unauthorized");

const filterStartEl = document.getElementById("filter-start");
const filterEndEl = document.getElementById("filter-end");
const filterGoalEl = document.getElementById("filter-goal");
const applyFiltersEl = document.getElementById("apply-filters");

const statTotalEl = document.getElementById("stat-total");
const statLatestEl = document.getElementById("stat-latest");
const statCommonEl = document.getElementById("stat-common");
const historyGridEl = document.getElementById("history-grid");
const noHistoryEl = document.getElementById("no-history");
const logoutBtnEl = document.getElementById("logout-btn");

let allHistory = [];

function normalizeDashboardHistory(payload) {
  if (Array.isArray(payload?.history)) {
    return payload.history;
  }

  if (Array.isArray(payload?.history?.entries)) {
    return payload.history.entries;
  }

  return [];
}

// Logout
logoutBtnEl?.addEventListener("click", async () => {
  await window.apiClient.logout();
  window.location.href = "/";
});

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString("pt-BR");
}

function renderStats(history) {
  if (statTotalEl) statTotalEl.textContent = String(history.length);

  if (history.length > 0) {
    const latest = new Date(history[0].createdAt).toLocaleDateString("pt-BR");
    if (statLatestEl) statLatestEl.textContent = latest;

    const objectives = history.map((h) => h.payload?.objetivo);
    const counts = {};
    objectives.forEach((obj) => {
      counts[obj] = (counts[obj] || 0) + 1;
    });
    const mostCommon = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";
    if (statCommonEl) statCommonEl.textContent = mostCommon || "-";
  } else {
    if (statLatestEl) statLatestEl.textContent = "-";
    if (statCommonEl) statCommonEl.textContent = "-";
  }
}

function renderHistory(history) {
  if (!historyGridEl || !noHistoryEl) return;

  if (history.length === 0) {
    historyGridEl.innerHTML = "";
    noHistoryEl.classList.remove("hidden");
    return;
  }

  noHistoryEl.classList.add("hidden");
  historyGridEl.innerHTML = history
    .map((entry) => {
      const date = formatDate(entry.createdAt);
      const objetivo = entry.payload?.objetivo || "-";
      const dias = entry.payload?.diasSemana || "-";
      const imc = entry.result?.analysis?.imc?.toFixed(1) || "-";
      const preview = entry.result?.workoutPlan?.substring(0, 100) + "..." || "";

      return `
        <article class="rounded-xl border border-white/20 bg-black/20 p-4">
          <p class="text-xs uppercase tracking-[0.2em] text-white/65">${date}</p>
          <p class="mt-2 text-sm font-semibold text-neonGreen">Objetivo: ${objetivo}</p>
          <p class="text-sm text-white/80">Dias/semana: ${dias} | IMC: ${imc}</p>
          <p class="mt-2 text-xs text-white/65 line-clamp-2">${preview}</p>
          <button data-entry-id="${entry.id}" class="mt-3 w-full rounded-lg border border-neonGreen/60 px-3 py-2 text-sm font-semibold text-neonGreen">
            Ver Ficha
          </button>
        </article>
      `;
    })
    .join("");

  historyGridEl.querySelectorAll("[data-entry-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const entryId = btn.getAttribute("data-entry-id");
      const entry = allHistory.find((h) => h.id === entryId);
      if (entry) {
        localStorage.setItem("workoutPayload", JSON.stringify(entry.payload));
        localStorage.setItem("workoutResult", JSON.stringify(entry.result));
        window.location.href = "/resultado";
      }
    });
  });
}

function applyFilters() {
  const startDate = filterStartEl?.value ? new Date(filterStartEl.value) : null;
  const endDate = filterEndEl?.value ? new Date(filterEndEl.value) : null;
  const goal = filterGoalEl?.value || "";

  const filtered = allHistory.filter((entry) => {
    const entryDate = new Date(entry.createdAt);

    if (startDate && entryDate < startDate) return false;
    if (endDate && entryDate > endDate) return false;
    if (goal && entry.payload?.objetivo !== goal) return false;

    return true;
  });

  renderStats(filtered);
  renderHistory(filtered);
}

applyFiltersEl?.addEventListener("click", applyFilters);

// Inicializar
async function init() {
  try {
    const data = await window.apiClient.getDashboard();
    allHistory = normalizeDashboardHistory(data);

    loadingEl?.classList.add("hidden");
    contentEl?.classList.remove("hidden");

    applyFilters();
  } catch (error) {
    if (error && typeof error === "object" && "status" in error && error.status === 401) {
      loadingEl?.classList.add("hidden");
      unauthorizedEl?.classList.remove("hidden");
      return;
    }

    console.error(error);
    loadingEl?.classList.add("hidden");
    unauthorizedEl?.classList.remove("hidden");
  }
}

init();

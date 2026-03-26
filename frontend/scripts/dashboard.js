const loadingEl = document.getElementById("loading");
const contentEl = document.getElementById("content");
const unauthorizedEl = document.getElementById("unauthorized");
const dashboardErrorEl = document.getElementById("dashboard-error");
const dashboardErrorMessageEl = document.getElementById("dashboard-error-message");
const retryDashboardEl = document.getElementById("retry-dashboard");

const filterStartEl = document.getElementById("filter-start");
const filterEndEl = document.getElementById("filter-end");
const filterGoalEl = document.getElementById("filter-goal");
const clearFiltersEl = document.getElementById("clear-filters");

const statTotalEl = document.getElementById("stat-total");
const statLatestEl = document.getElementById("stat-latest");
const statCommonEl = document.getElementById("stat-common");
const progressGridEl = document.getElementById("progress-grid");
const progressEmptyEl = document.getElementById("progress-empty");
const historyGridEl = document.getElementById("history-grid");
const noHistoryEl = document.getElementById("no-history");
const logoutBtnEl = document.getElementById("logout-btn");
const goReadyResultEl = document.getElementById("go-ready-result");

let allHistory = [];
const LOCAL_HISTORY_KEY = "workoutHistory";
const DEFAULT_CLINICAL_RULES = {
  idadeIdosaMinima: 60,
  imcObesidade: 30,
  imcObesidadeGrave: 35,
  imcRiscoMaximo: 40,
  imcDesnutricao: 18.5,
  riscoArticularPattern: "joelho|quadril|coluna|lombar|articul|hernia|dor\\s*cronica|tendinit|bursit|lesa",
  comorbidadePattern: "hiperten|diabet|insulin|cardi|asma|dpo|tireo|fibromial|lupus|artrite|artrose",
};

let clinicalRules = { ...DEFAULT_CLINICAL_RULES };

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getLocalHistory() {
  try {
    const raw = localStorage.getItem(LOCAL_HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatImc(entry) {
  const imcNumber = Number(entry?.result?.analysis?.imc);
  if (Number.isFinite(imcNumber) && imcNumber > 0) {
    return imcNumber.toFixed(1);
  }
  return "-";
}

function formatGoalLabel(goal) {
  const value = String(goal || "").trim().toLowerCase();
  if (value === "emagrecimento") return "Emagrecimento";
  if (value === "hipertrofia") return "Hipertrofia";
  if (value === "definicao") return "Definição";
  return "-";
}

function getGoalBadgeClass(goal) {
  const value = String(goal || "").trim().toLowerCase();
  if (value === "emagrecimento") return "border-neonGreen/40 bg-neonGreen/10 text-neonGreen";
  if (value === "hipertrofia") return "border-neonYellow/40 bg-neonYellow/10 text-neonYellow";
  if (value === "definicao") return "border-pink-300/50 bg-pink-300/10 text-pink-200";
  return "border-white/30 bg-white/10 text-white";
}

function buildPlanPreview(result) {
  const workoutPlan = result?.workoutPlan;
  if (typeof workoutPlan === "string") {
    const text = workoutPlan.trim();
    return text.length > 100 ? `${text.slice(0, 100)}...` : text || "Sem resumo disponível";
  }

  if (workoutPlan && typeof workoutPlan === "object") {
    const parts = [
      String(workoutPlan?.analise || "").trim(),
      String(workoutPlan?.estrategia || "").trim(),
      String(workoutPlan?.ciclo || "").trim(),
    ].filter(Boolean);

    const text = parts.join(" ").trim();
    return text.length > 100 ? `${text.slice(0, 100)}...` : text || "Sem resumo disponível";
  }

  return "Sem resumo disponível";
}

function normalizeDashboardHistory(payload) {
  if (Array.isArray(payload?.history)) return payload.history;
  if (Array.isArray(payload?.history?.entries)) return payload.history.entries;
  return [];
}

function resolveClinicalRules(payload) {
  const incoming = payload?.clinicalRules;
  if (!incoming || typeof incoming !== "object") {
    return { ...DEFAULT_CLINICAL_RULES };
  }

  return {
    idadeIdosaMinima: Number(incoming.idadeIdosaMinima) || DEFAULT_CLINICAL_RULES.idadeIdosaMinima,
    imcObesidade: Number(incoming.imcObesidade) || DEFAULT_CLINICAL_RULES.imcObesidade,
    imcObesidadeGrave: Number(incoming.imcObesidadeGrave) || DEFAULT_CLINICAL_RULES.imcObesidadeGrave,
    imcRiscoMaximo: Number(incoming.imcRiscoMaximo) || DEFAULT_CLINICAL_RULES.imcRiscoMaximo,
    imcDesnutricao: Number(incoming.imcDesnutricao) || DEFAULT_CLINICAL_RULES.imcDesnutricao,
    riscoArticularPattern: String(incoming.riscoArticularPattern || DEFAULT_CLINICAL_RULES.riscoArticularPattern),
    comorbidadePattern: String(incoming.comorbidadePattern || DEFAULT_CLINICAL_RULES.comorbidadePattern),
  };
}

logoutBtnEl?.addEventListener("click", async () => {
  await window.apiClient.logout();
  window.location.href = "/";
});

goReadyResultEl?.addEventListener("click", (event) => {
  event.preventDefault();
  const latestEntry = allHistory[0];
  if (latestEntry?.payload && latestEntry?.result) {
    localStorage.setItem("workoutPayload", JSON.stringify(latestEntry.payload));
    localStorage.setItem("workoutResult", JSON.stringify(latestEntry.result));
  }
  window.location.href = "/resultado";
});

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString("pt-BR");
}

function toInputDateValue(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseInputDateValue(value, endOfDay = false) {
  if (!value) return null;

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;

  return endOfDay
    ? new Date(year, month - 1, day, 23, 59, 59, 999)
    : new Date(year, month - 1, day, 0, 0, 0, 0);
}

function formatPeriodLabel(startIso, endIso) {
  const startLabel = formatDate(startIso);
  const endLabel = endIso ? formatDate(endIso) : "Em andamento";
  return `${startLabel} até ${endLabel}`;
}

function getCadenceDays(periodicidade) {
  if (periodicidade === "quinzenal") return 14;
  if (periodicidade === "mensal") return 30;
  return 7;
}

function getCadenceLabel(periodicidade) {
  if (periodicidade === "quinzenal") return "Quinzenal";
  if (periodicidade === "mensal") return "Mensal";
  return "Semanal";
}

function getEntryPeriodicidade(entry) {
  return String(entry?.payload?.periodicidade || "semanal").toLowerCase();
}

function getProjectedEndDate(startIso, periodicidade) {
  const startDate = new Date(startIso);
  if (Number.isNaN(startDate.getTime())) return null;

  const endDate = new Date(startDate);
  const cadenceDays = getCadenceDays(periodicidade);
  endDate.setDate(endDate.getDate() + cadenceDays - 1);
  return endDate.toISOString();
}

function getEntryEndDate(entry, history, index) {
  const projectedEnd = getProjectedEndDate(entry.createdAt, getEntryPeriodicidade(entry));

  if (index === 0) {
    if (!projectedEnd) return null;
    const now = new Date();
    return now <= new Date(projectedEnd) ? null : projectedEnd;
  }

  const previousNewer = history[index - 1];
  const previousDate = previousNewer?.createdAt ? new Date(previousNewer.createdAt) : null;
  if (projectedEnd && previousDate && previousDate <= new Date(projectedEnd)) {
    return previousNewer.createdAt;
  }

  return projectedEnd;
}

function applyAutomaticFilterDefaults(history) {
  if (!Array.isArray(history) || history.length === 0) {
    if (filterStartEl) filterStartEl.value = "";
    if (filterEndEl) filterEndEl.value = "";
    if (filterGoalEl) filterGoalEl.value = "";
    return;
  }

  const oldest = history[history.length - 1];
  const latest = history[0];
  if (filterStartEl) filterStartEl.value = toInputDateValue(oldest.createdAt);
  if (filterEndEl) filterEndEl.value = history.length > 1 ? toInputDateValue(latest.createdAt) : "";
  if (filterGoalEl) filterGoalEl.value = "";
}

function renderStats(history) {
  if (statTotalEl) statTotalEl.textContent = String(history.length);

  if (history.length > 0) {
    const latest = new Date(history[0].createdAt).toLocaleDateString("pt-BR");
    if (statLatestEl) statLatestEl.textContent = latest;

    const validDays = history
      .map((h) => Number(h?.payload?.diasSemana))
      .filter((value) => Number.isFinite(value) && value > 0);

    const averageDays = validDays.length > 0
      ? (validDays.reduce((acc, value) => acc + value, 0) / validDays.length).toFixed(1)
      : "-";

    if (statCommonEl) {
      statCommonEl.textContent = averageDays === "-" ? "-" : `${averageDays} dias/semana`;
    }
  } else {
    if (statLatestEl) statLatestEl.textContent = "-";
    if (statCommonEl) statCommonEl.textContent = "-";
  }
}

function resolveIntensityRank(intensity) {
  const normalized = String(intensity || "").toLowerCase().trim();
  if (normalized === "leve") return 1;
  if (normalized === "moderada") return 2;
  if (normalized === "intensa") return 3;
  return 0;
}

function intensityDeltaLabel(oldIntensity, newIntensity) {
  const oldRank = resolveIntensityRank(oldIntensity);
  const newRank = resolveIntensityRank(newIntensity);
  if (!oldRank || !newRank) return "Sem dados suficientes";
  if (newRank > oldRank) return "Evolução positiva";
  if (newRank < oldRank) return "Redução de intensidade";
  return "Intensidade estável";
}

function getImcTrendScore(goal, imcDelta) {
  if (!Number.isFinite(imcDelta)) return 0;
  const normalizedGoal = String(goal || "").toLowerCase().trim();

  if (normalizedGoal === "emagrecimento" || normalizedGoal === "definicao") {
    if (imcDelta < -0.2) return 1;
    if (imcDelta > 0.2) return -1;
    return 0;
  }

  if (normalizedGoal === "hipertrofia") {
    if (imcDelta >= 0 && imcDelta <= 1.5) return 1;
    if (imcDelta < -0.3) return -1;
  }

  return 0;
}

function normalizeText(text) {
  return String(text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function getClinicalFlagsFromEntry(entry) {
  const payload = entry?.payload || {};
  const imc = Number(entry?.result?.analysis?.imc);
  const idade = Number(payload?.idade);
  const notes = normalizeText(payload?.observacoes || "");
  const riscoArticular = new RegExp(clinicalRules.riscoArticularPattern).test(notes);
  const comorbidade = new RegExp(clinicalRules.comorbidadePattern).test(notes);

  return {
    idosa: Number.isFinite(idade) && idade >= clinicalRules.idadeIdosaMinima,
    obesidade: Number.isFinite(imc) && imc >= clinicalRules.imcObesidade,
    obesidadeGrave: Number.isFinite(imc) && imc >= clinicalRules.imcObesidadeGrave,
    riscoMaximo: Number.isFinite(imc) && imc >= clinicalRules.imcRiscoMaximo,
    desnutricao: Number.isFinite(imc) && imc < clinicalRules.imcDesnutricao,
    riscoArticular,
    comorbidade,
  };
}

function isConservativeClinicalContext(latestEntry) {
  const flags = getClinicalFlagsFromEntry(latestEntry);
  const intensity = String(latestEntry?.result?.analysis?.intensidadeSugerida || "").toLowerCase();

  if (flags.idosa || flags.comorbidade || flags.riscoArticular) return true;
  if (flags.riscoMaximo || flags.obesidadeGrave || (flags.obesidade && intensity === "leve")) return true;
  if (flags.desnutricao && intensity === "leve") return true;
  return false;
}

function buildOverallEvolutionStatus({ goal, frequencyDelta, firstIntensity, latestIntensity, imcDelta, conservativeContext }) {
  let score = 0;

  if (frequencyDelta !== null) {
    if (frequencyDelta > 0) score += 1;
    if (frequencyDelta < 0 && !conservativeContext) score -= 1;
  }

  const oldRank = resolveIntensityRank(firstIntensity);
  const newRank = resolveIntensityRank(latestIntensity);
  if (oldRank && newRank) {
    if (newRank > oldRank) score += 1;
    if (newRank < oldRank && !conservativeContext) score -= 1;
  }

  score += getImcTrendScore(goal, imcDelta);

  if (score >= 2) {
    return {
      title: "Evolução favorável",
      subtitle: "Histórico com tendência positiva para o objetivo atual.",
      className: "border-neonGreen/40 bg-neonGreen/10 text-neonGreen",
    };
  }

  if (score <= -1) {
    return {
      title: "Evolução em atenção",
      subtitle: "Alguns indicadores pedem ajuste de estratégia e acompanhamento.",
      className: "border-red-300/60 bg-red-400/10 text-red-200",
    };
  }

  return {
    title: "Evolução estável",
    subtitle: "Tendência neutra: manter consistência e revisar progressão.",
    className: "border-neonYellow/40 bg-neonYellow/10 text-neonYellow",
  };
}

function renderProgressEvaluation(history) {
  if (!progressGridEl || !progressEmptyEl) return;

  if (!Array.isArray(history) || history.length < 2) {
    progressGridEl.innerHTML = "";
    progressEmptyEl.classList.remove("hidden");
    return;
  }

  const ordered = [...history].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const first = ordered[0];
  const latest = ordered[ordered.length - 1];

  const firstObjective = formatGoalLabel(first?.payload?.objetivo);
  const latestObjective = formatGoalLabel(latest?.payload?.objetivo);
  const firstDays = Number(first?.payload?.diasSemana);
  const latestDays = Number(latest?.payload?.diasSemana);
  const frequencyDelta = Number.isFinite(firstDays) && Number.isFinite(latestDays) ? latestDays - firstDays : null;

  const firstImc = Number(first?.result?.analysis?.imc);
  const latestImc = Number(latest?.result?.analysis?.imc);
  const imcDeltaValue = Number.isFinite(firstImc) && Number.isFinite(latestImc) ? latestImc - firstImc : null;
  const imcDeltaLabel = Number.isFinite(imcDeltaValue) ? imcDeltaValue.toFixed(1) : "-";

  const firstIntensity = first?.result?.analysis?.intensidadeSugerida || "-";
  const latestIntensity = latest?.result?.analysis?.intensidadeSugerida || "-";
  const conservativeContext = isConservativeClinicalContext(latest);
  const overallStatus = buildOverallEvolutionStatus({
    goal: latest?.payload?.objetivo,
    frequencyDelta,
    firstIntensity,
    latestIntensity,
    imcDelta: imcDeltaValue,
    conservativeContext,
  });

  const cards = [
    {
      title: "Status geral",
      value: `<span class="inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${overallStatus.className}">${overallStatus.title}</span>`,
      subtitle: conservativeContext ? `${overallStatus.subtitle} Contexto clínico conservador considerado na avaliação.` : overallStatus.subtitle,
      isHtmlValue: true,
    },
    {
      title: "Período analisado",
      value: `${formatDate(first.createdAt)} até ${formatDate(latest.createdAt)}`,
      subtitle: `${ordered.length} fichas avaliadas`,
    },
    {
      title: "Objetivo",
      value: `${firstObjective} → ${latestObjective}`,
      subtitle: firstObjective === latestObjective ? "Objetivo mantido" : "Objetivo ajustado ao longo do histórico",
    },
    {
      title: "Frequência semanal",
      value: Number.isFinite(firstDays) && Number.isFinite(latestDays) ? `${firstDays} → ${latestDays} dias/semana` : "Sem dados suficientes",
      subtitle: frequencyDelta === null ? "Não foi possível calcular variação" : frequencyDelta === 0 ? "Frequência estável" : frequencyDelta > 0 ? `Aumento de ${frequencyDelta} dia(s)` : `Redução de ${Math.abs(frequencyDelta)} dia(s)`,
    },
    {
      title: "Intensidade sugerida",
      value: `${firstIntensity} → ${latestIntensity}`,
      subtitle: intensityDeltaLabel(firstIntensity, latestIntensity),
    },
    {
      title: "IMC",
      value: Number.isFinite(firstImc) && Number.isFinite(latestImc) ? `${firstImc.toFixed(1)} → ${latestImc.toFixed(1)}` : "Sem dados suficientes",
      subtitle: imcDeltaLabel === "-" ? "Não foi possível calcular variação" : `Variação: ${imcDeltaLabel}`,
    },
    {
      title: "Progressão semanal",
      value: String(latest?.result?.analysis?.progressaoSemanal || "Sem dados"),
      subtitle: "Recomendação da ficha mais recente",
    },
  ];

  progressGridEl.innerHTML = cards.map((card) => `
        <article class="rounded-xl border border-white/20 bg-black/20 p-4">
          <p class="text-xs uppercase tracking-[0.2em] text-white/65">${escapeHtml(card.title)}</p>
          <p class="mt-2 text-sm font-semibold text-white">${card.isHtmlValue ? card.value : escapeHtml(String(card.value))}</p>
          <p class="mt-2 text-xs text-white/70">${escapeHtml(card.subtitle)}</p>
        </article>
      `).join("");

  progressEmptyEl.classList.add("hidden");
}

function setDashboardViewState({ loading, content, unauthorized, error }) {
  loadingEl?.classList.toggle("hidden", !loading);
  contentEl?.classList.toggle("hidden", !content);
  unauthorizedEl?.classList.toggle("hidden", !unauthorized);
  dashboardErrorEl?.classList.toggle("hidden", !error);
}

function buildHistoryEntryCard(entry, history, index) {
  const date = formatDate(entry.createdAt);
  const periodicidade = getEntryPeriodicidade(entry);
  const periodicidadeLabel = getCadenceLabel(periodicidade);
  const endDate = getEntryEndDate(entry, history, index);
  const periodLabel = formatPeriodLabel(entry.createdAt, endDate);
  const nome = entry.payload?.nome || "-";
  const objetivo = entry.payload?.objetivo || "-";
  const objetivoLabel = formatGoalLabel(objetivo);
  const objetivoBadgeClass = getGoalBadgeClass(objetivo);
  const dias = entry.payload?.diasSemana || "-";
  const imc = formatImc(entry);
  const preview = buildPlanPreview(entry.result);
  const safeEntryId = escapeHtml(entry.id);

  return `
      <article class="rounded-xl border border-white/20 bg-black/20 p-4">
        <div class="flex items-start justify-between gap-3">
          <p class="text-xs uppercase tracking-[0.2em] text-white/65">${escapeHtml(date)}</p>
          <span class="rounded-full border px-2 py-1 text-xs font-semibold ${objetivoBadgeClass}">${escapeHtml(objetivoLabel)}</span>
        </div>
        <p class="mt-2 text-xs text-white/70">Periodicidade: <strong>${escapeHtml(periodicidadeLabel)}</strong></p>
        <p class="mt-1 text-xs text-white/70">Período: <strong>${escapeHtml(periodLabel)}</strong></p>
        <p class="mt-2 text-sm font-semibold text-neonGreen">Cliente: ${escapeHtml(nome)}</p>
        <dl class="mt-3 grid gap-2 text-sm text-white/85">
          <div class="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/30 px-3 py-2">
            <dt class="text-white/70">Objetivo</dt>
            <dd class="font-semibold">${escapeHtml(objetivoLabel)}</dd>
          </div>
          <div class="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/30 px-3 py-2">
            <dt class="text-white/70">Dias por semana</dt>
            <dd class="font-semibold">${escapeHtml(dias)}</dd>
          </div>
          <div class="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/30 px-3 py-2">
            <dt class="text-white/70">IMC</dt>
            <dd class="font-semibold">${escapeHtml(imc)}</dd>
          </div>
        </dl>
        <p class="mt-3 text-xs text-white/70 line-clamp-2">${escapeHtml(preview)}</p>
        <button data-entry-id="${safeEntryId}" class="neon-button mt-3 w-full text-sm">
          Ver Ficha
        </button>
      </article>
    `;
}

function renderHistory(history) {
  if (!historyGridEl || !noHistoryEl) return;
  if (history.length === 0) {
    historyGridEl.innerHTML = "";
    noHistoryEl.classList.remove("hidden");
    return;
  }

  noHistoryEl.classList.add("hidden");
  historyGridEl.innerHTML = history.map((entry, index) => buildHistoryEntryCard(entry, history, index)).join("");

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
  const startDate = parseInputDateValue(filterStartEl?.value || "");
  const endDate = parseInputDateValue(filterEndEl?.value || "", true);
  const goal = filterGoalEl?.value || "";

  const filtered = allHistory.filter((entry) => {
    const entryDate = new Date(entry.createdAt);
    if (startDate && entryDate < startDate) return false;
    if (endDate && entryDate > endDate) return false;
    if (goal && entry.payload?.objetivo !== goal) return false;
    return true;
  });

  renderStats(filtered);
  renderProgressEvaluation(filtered);
  renderHistory(filtered);
}

clearFiltersEl?.addEventListener("click", () => {
  if (filterStartEl) filterStartEl.value = "";
  if (filterEndEl) filterEndEl.value = "";
  if (filterGoalEl) filterGoalEl.value = "";
  applyFilters();
});

filterStartEl?.addEventListener("change", applyFilters);
filterEndEl?.addEventListener("change", applyFilters);
filterGoalEl?.addEventListener("change", applyFilters);

async function init() {
  setDashboardViewState({ loading: true, content: false, unauthorized: false, error: false });

  try {
    const data = await window.apiClient.getDashboard();
    clinicalRules = resolveClinicalRules(data);
    const remoteHistory = normalizeDashboardHistory(data);
    const localHistory = getLocalHistory();
    const sourceHistory = remoteHistory.length > 0 ? remoteHistory : localHistory;

    allHistory = sourceHistory.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    setDashboardViewState({ loading: false, content: true, unauthorized: false, error: false });
    applyAutomaticFilterDefaults(allHistory);
    applyFilters();
  } catch (error) {
    if (error && typeof error === "object" && "status" in error && error.status === 401) {
      setDashboardViewState({ loading: false, content: false, unauthorized: true, error: false });
      return;
    }

    console.error(error);
    setDashboardViewState({ loading: false, content: false, unauthorized: false, error: true });

    if (dashboardErrorMessageEl) {
      dashboardErrorMessageEl.textContent = error instanceof Error && error.message
        ? `Falha ao carregar dados: ${error.message}`
        : "Tivemos uma instabilidade ao carregar o dashboard.";
    }
  }
}

retryDashboardEl?.addEventListener("click", () => {
  init();
});

init();
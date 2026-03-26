const loadingEl = document.getElementById("loading");
const resultEl = document.getElementById("result");
const errorEl = document.getElementById("error");
const contentEl = document.getElementById("workout-content");
const adjustmentCardEl = document.getElementById("adjustment-card");
const analysisCardsEl = document.getElementById("analysis-cards");
const supportCardsEl = document.getElementById("support-cards");
const clientGreetingEl = document.getElementById("client-greeting");
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

const syncModule = (() => {
  const LOCAL_HISTORY_KEY = "workoutHistory";

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

  return {
    getLocalHistory,
    saveLocalHistory,
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
  const limited = history.slice(0, HISTORY_LIMIT);
  syncModule.saveLocalHistory(limited);
  syncModule.syncHistoryWithServer(limited);
}

function saveWorkoutToHistory(payload, result) {
  const history = getHistory();
  const item = {
    id: createHistoryId(),
    createdAt: new Date().toISOString(),
    payload,
    result,
  };

  const currentSignature = getWorkoutPlanSignature(result?.workoutPlan);
  const deduped = history.filter((entry) => getWorkoutPlanSignature(entry?.result?.workoutPlan) !== currentSignature);
  saveHistory([item, ...deduped]);
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

function isStructuredWorkoutPlan(workoutPlan) {
  return Boolean(
    workoutPlan
    && typeof workoutPlan === "object"
    && Array.isArray(workoutPlan.treinos),
  );
}

function structuredPlanToText(workoutPlan) {
  if (!workoutPlan || typeof workoutPlan !== "object") {
    return "";
  }

  const treinos = Array.isArray(workoutPlan.treinos) ? workoutPlan.treinos : [];
  const distribuicao = Array.isArray(workoutPlan.distribuicaoSemanal) ? workoutPlan.distribuicaoSemanal : [];
  const substituicoes = Array.isArray(workoutPlan.substituicoes) ? workoutPlan.substituicoes : [];
  const dicas = Array.isArray(workoutPlan?.cards?.dicas) ? workoutPlan.cards.dicas : [];
  const comentarios = Array.isArray(workoutPlan?.cards?.comentarios) ? workoutPlan.cards.comentarios : [];

  const lines = [];
  if (workoutPlan.analise) lines.push("1) Analise da cliente", String(workoutPlan.analise));
  if (workoutPlan.ajusteObjetivo) lines.push("2) Ajuste de objetivo", String(workoutPlan.ajusteObjetivo));
  if (workoutPlan.estrategia) lines.push("3) Estrategia da ficha", String(workoutPlan.estrategia));
  if (workoutPlan.ciclo) lines.push("4) Estrutura do ciclo", String(workoutPlan.ciclo));

  lines.push("5) Ficha detalhada");
  treinos.forEach((treino) => {
    const dia = String(treino?.dia || "").trim().toUpperCase();
    const nome = String(treino?.nome || "").trim();
    lines.push(nome ? `Treino ${dia} - ${nome}` : `Treino ${dia || "A"}`);

    const exercicios = Array.isArray(treino?.exercicios) ? treino.exercicios : [];
    exercicios.forEach((exercicio) => {
      const nomeEx = String(exercicio?.nome || "Exercicio").trim();
      const series = String(exercicio?.series || "3").trim();
      const repeticoes = String(exercicio?.repeticoes || "10 a 12").trim();
      const carga = String(exercicio?.carga || "moderada").trim().toLowerCase();
      const grupo = String(exercicio?.grupoMuscular || "geral").trim();
      lines.push(`${nomeEx} - ${series}x${repeticoes} - carga ${carga} (${grupo})`);
    });
  });

  if (distribuicao.length > 0) {
    lines.push("6) Distribuicao por dias", ...distribuicao.map((item) => String(item)));
  }

  if (substituicoes.length > 0) {
    lines.push("7) Substituicoes inteligentes", ...substituicoes.map((item) => String(item)));
  }

  if (dicas.length > 0) {
    lines.push("8) Dicas finais", ...dicas.map((item, index) => `${index + 1}) ${String(item)}`));
  }

  if (comentarios.length > 0) {
    lines.push("9) Comentarios curtos para cards", ...comentarios.map((item) => String(item)));
  }

  if (workoutPlan.observacoesFinais) {
    lines.push("10) Fechamento profissional", String(workoutPlan.observacoesFinais));
  }

  return lines.join("\n");
}

function getWorkoutPlanText(workoutPlan) {
  if (typeof workoutPlan === "string") {
    return workoutPlan;
  }

  return structuredPlanToText(workoutPlan);
}

function getWorkoutPlanSignature(workoutPlan) {
  if (typeof workoutPlan === "string") {
    return normalizePlanText(workoutPlan);
  }

  try {
    return JSON.stringify(workoutPlan || {});
  } catch {
    return String(workoutPlan || "");
  }
}

function normalizeWorkoutLine(line) {
  return String(line || "")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTextForPattern(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isExerciseHeaderLine(line) {
  const normalized = normalizeTextForPattern(line);
  return normalized === "exercicio"
    || normalized === "series x repeticoes"
    || normalized === "series e repeticoes"
    || normalized === "grupo muscular"
    || normalized === "carga"
    || normalized.includes("exercicio |")
    || normalized.includes("series x repeticoes |")
    || normalized.includes("grupo muscular |")
    || normalized.includes("carga | ");
}

function isWorkoutNoteLine(line) {
  return /^(?:observacao|observacoes|dica|dicas|descanso|aquecimento|cardio|nota|notas|orientacao|orientacoes)\b/i.test(
    normalizeTextForPattern(line),
  );
}

function extractSeriesReps(text) {
  const match = text.match(/(\d+\s*(?:series?)?\s*[xX]\s*\d+(?:\s*(?:a|-)\s*\d+)?(?:\s*repeticoes?)?)/i);
  return match ? match[1].replace(/\s+/g, " ").trim() : "";
}

function extractCarga(text) {
  const match = text.match(/(?:carga\s*)?(leve|moderada|alta)\b/i);
  return match ? match[1].toLowerCase() : "";
}

function stripKnownSegments(text) {
  return text
    .replace(/^(?:\d+[\).:-]\s*)/, "")
    .replace(/(\d+\s*(?:series?)?\s*[xX]\s*\d+(?:\s*(?:a|-)\s*\d+)?(?:\s*repeticoes?)?)/i, "")
    .replace(/(?:carga\s*)?(leve|moderada|alta)\b/i, "")
    .replace(/[|:-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseExerciseLine(line, currentBlock) {
  const normalized = normalizeWorkoutLine(line);
  if (!normalized || isExerciseHeaderLine(normalized) || isWorkoutNoteLine(normalized)) {
    return null;
  }

  const parentheticalGroupMatch = normalized.match(/\(([^)]+)\)\s*$/);
  const parentheticalGroup = parentheticalGroupMatch?.[1]?.trim() || "";
  const lineWithoutTrailingGroup = parentheticalGroupMatch
    ? normalized.slice(0, parentheticalGroupMatch.index).trim()
    : normalized;

  const pipeParts = lineWithoutTrailingGroup.split("|").map((part) => part.trim()).filter(Boolean);
  const structuredParts = pipeParts.length > 1
    ? pipeParts
    : lineWithoutTrailingGroup.split(/\s+-\s+|\s:\s/).map((part) => part.trim()).filter(Boolean);

  let exercicio = "";
  let seriesReps = "";
  let carga = "";
  let grupoMuscular = parentheticalGroup || "";

  structuredParts.forEach((part, index) => {
    if (!seriesReps) {
      seriesReps = extractSeriesReps(part) || seriesReps;
    }

    if (!carga) {
      carga = extractCarga(part) || carga;
    }

    if (index === 0 && !exercicio) {
      const cleanedExercise = stripKnownSegments(part);
      if (cleanedExercise) {
        exercicio = cleanedExercise;
        return;
      }
    }

    if (!grupoMuscular && !extractSeriesReps(part) && !extractCarga(part)) {
      const cleanedGroup = stripKnownSegments(part);
      if (cleanedGroup.length >= 3) {
        grupoMuscular = cleanedGroup;
      }
    }
  });

  if (!exercicio) {
    const fallbackSeries = extractSeriesReps(lineWithoutTrailingGroup);
    if (!fallbackSeries) {
      return null;
    }

    seriesReps = seriesReps || fallbackSeries;
    carga = carga || extractCarga(lineWithoutTrailingGroup);
    exercicio = stripKnownSegments(lineWithoutTrailingGroup.split(/\d+\s*(?:series?)?\s*[xX]/i)[0] || "");
  }

  if (!exercicio || exercicio.length < 3 || !seriesReps) {
    return null;
  }

  return {
    bloco: currentBlock,
    exercicio,
    seriesReps,
    carga: carga || "-",
    grupoMuscular: grupoMuscular || "-",
  };
}

function parseWorkoutNote(line) {
  const normalized = normalizeWorkoutLine(line);
  if (!normalized || !isWorkoutNoteLine(normalized)) {
    return "";
  }

  return normalized.replace(/^(?:observacao|observacoes|dica|dicas|descanso|aquecimento|cardio|nota|notas|orientacao|orientacoes)\s*[:\-]?\s*/i, "").trim();
}

function extractWorkoutSections(workoutPlan) {
  const normalized = normalizePlanText(workoutPlan);
  const lines = normalized.split("\n").map((line) => line.trim()).filter(Boolean);
  const sections = [];
  let currentBlock = "Treino";
  let currentSection = { bloco: currentBlock, rows: [], notes: [] };

  for (const line of lines) {
    const blockMatch = line.match(/^treino\s*([A-D])(?:\s*[-:]\s*(.+))?/i);
    if (blockMatch) {
      if (currentSection.rows.length > 0 || currentSection.notes.length > 0) {
        sections.push(currentSection);
      }

      const suffix = blockMatch[2]?.trim();
      currentBlock = suffix ? `Treino ${blockMatch[1].toUpperCase()} - ${suffix}` : `Treino ${blockMatch[1].toUpperCase()}`;
      currentSection = { bloco: currentBlock, rows: [], notes: [] };
      continue;
    }

    const parsedNote = parseWorkoutNote(line);
    if (parsedNote) {
      currentSection.notes.push(parsedNote);
      continue;
    }

    const parsedRow = parseExerciseLine(line, currentBlock);
    if (parsedRow) {
      currentSection.rows.push(parsedRow);
    }
  }

  if (currentSection.rows.length > 0 || currentSection.notes.length > 0) {
    sections.push(currentSection);
  }

  return sections.filter((section) => section.rows.length > 0 || section.notes.length > 0);
}

function extractWorkoutRows(workoutPlan) {
  return extractWorkoutSections(workoutPlan).flatMap((section) => section.rows);
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

function getClientFirstName(payload) {
  const fullName = String(payload?.nome || "").trim();
  return fullName ? fullName.split(/\s+/)[0] || "" : "";
}

function toDisplayName(value) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return "";
  }

  return normalized
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function renderClientGreeting(payload) {
  if (!clientGreetingEl) return;

  const firstName = toDisplayName(getClientFirstName(payload));
  clientGreetingEl.textContent = firstName
    ? `Olá, ${firstName}. Sua ficha exclusiva foi desenhada com estratégia e precisão para elevar sua evolução.`
    : "Sua ficha exclusiva foi preparada com estratégia, precisão e foco total no seu objetivo.";
}

function buildAdjustmentText(data, payload) {
  return data?.analysis?.mensagemAjuste
    || `Objetivo mantido em ${data?.analysis?.objetivoFinal || payload?.objetivo || "-"} com base na avaliação atual da cliente.`;
}

function buildAnalysisCards(data) {
  const cards = [];

  if (data?.analysis?.contextoClinico) {
    cards.push({
      title: "Comentário clínico",
      text: data.analysis.contextoClinico,
      accentClass: "border-neonGreen/35 bg-neonGreen/10",
    });
  }

  cards.push({
    title: "Objetivo final",
    text: `Objetivo recomendado: ${data?.analysis?.objetivoFinal || "-"}.`,
    accentClass: "border-neonYellow/25 bg-white/5",
  });

  cards.push({
    title: "Frequência recomendada",
    text: `${data?.analysis?.diasTreinoAjustados || "-"} dia(s) por semana.${data?.analysis?.motivoAjusteDiasTreino ? ` ${data.analysis.motivoAjusteDiasTreino}` : ""}`,
    accentClass: "border-white/20 bg-white/5",
  });

  cards.push({
    title: "Nível de risco",
    text: `Classificação atual: ${data?.analysis?.nivelRisco || "moderado"}.`,
    accentClass: "border-white/20 bg-white/5",
  });

  return cards.slice(0, 4);
}

function buildSupportCards(data, payload) {
  const cards = [];

  if (String(payload?.nivel || "").toLowerCase() === "iniciante") {
    cards.push({
      title: "Execução e técnica",
      text: "Priorize mobilidade, flexibilidade, técnica correta e controle do movimento antes de aumentar a carga.",
      accentClass: "border-white/20 bg-white/5",
    });
  }

  const comments = Array.isArray(data?.analysis?.comentariosEssenciais)
    ? data.analysis.comentariosEssenciais.filter(Boolean).slice(0, 3)
    : [];

  comments.forEach((comment, index) => {
    cards.push({
      title: index === 0 ? "Monitoramento" : index === 1 ? "Recuperação" : "Comentário essencial",
      text: comment,
      accentClass: "border-white/20 bg-white/5",
    });
  });

  cards.push({
    title: "Hidratação e recuperação",
    text: "Mantenha hidratação ao longo do dia, respeite o descanso e observe sinais de fadiga para evoluir com segurança.",
    accentClass: "border-white/20 bg-white/5",
  });

  return cards.slice(0, 4);
}

function renderAdjustmentCard(data, payload) {
  if (!adjustmentCardEl) return;

  adjustmentCardEl.innerHTML = `
    <article class="advice-card border-neonYellow/35 bg-neonYellow/10">
      <p class="text-xs font-bold uppercase tracking-[0.18em] text-neonYellow">Ajuste de objetivo</p>
      <p class="mt-2 text-sm leading-relaxed text-white/90">${escapeHtml(buildAdjustmentText(data, payload))}</p>
    </article>
  `;
  adjustmentCardEl.classList.remove("hidden");
}

function renderAnalysisCards(data) {
  if (!analysisCardsEl) return;

  analysisCardsEl.innerHTML = buildAnalysisCards(data).map((card) => `
    <article class="advice-card ${card.accentClass}">
      <p class="text-xs font-bold uppercase tracking-[0.18em] text-neonYellow">${escapeHtml(card.title)}</p>
      <p class="mt-2 text-sm leading-relaxed text-white/90">${escapeHtml(card.text)}</p>
    </article>
  `).join("");
}

function renderSupportCards(data, payload) {
  if (!supportCardsEl) return;

  supportCardsEl.innerHTML = buildSupportCards(data, payload).map((card) => `
    <article class="advice-card ${card.accentClass}">
      <p class="text-xs font-bold uppercase tracking-[0.18em] text-neonYellow">${escapeHtml(card.title)}</p>
      <p class="mt-2 text-sm leading-relaxed text-white/90">${escapeHtml(card.text)}</p>
    </article>
  `).join("");
}

function buildPlanNarrativeCards(workoutPlan) {
  if (!isStructuredWorkoutPlan(workoutPlan)) {
    return [];
  }

  const sections = [
    {
      title: "Análise da cliente",
      text: String(workoutPlan.analise || "").trim(),
      accentClass: "border-neonGreen/35 bg-neonGreen/10",
    },
    {
      title: "Ajuste de objetivo",
      text: String(workoutPlan.ajusteObjetivo || "").trim(),
      accentClass: "border-neonYellow/35 bg-neonYellow/10",
    },
    {
      title: "Estratégia da ficha",
      text: String(workoutPlan.estrategia || "").trim(),
      accentClass: "border-white/20 bg-white/5",
    },
    {
      title: "Estrutura do ciclo",
      text: String(workoutPlan.ciclo || "").trim(),
      accentClass: "border-white/20 bg-white/5",
    },
  ];

  return sections.filter((section) => section.text.length > 0);
}

function renderPlanNarrative(workoutPlan) {
  const cards = buildPlanNarrativeCards(workoutPlan);
  if (cards.length === 0) {
    return "";
  }

  return `
    <section class="rounded-2xl border border-white/20 bg-black/20 p-4 md:p-5">
      <h3 class="text-sm font-bold uppercase tracking-[0.18em] text-neonYellow">Diagnóstico e estratégia</h3>
      <div class="mt-3 grid gap-3 md:grid-cols-2">
        ${cards.map((card) => `
          <article class="advice-card ${card.accentClass}">
            <p class="text-xs font-bold uppercase tracking-[0.18em] text-neonYellow">${escapeHtml(card.title)}</p>
            <p class="mt-2 text-sm leading-relaxed text-white/90">${escapeHtml(card.text)}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function extractWorkoutSectionsFromStructuredPlan(workoutPlan) {
  if (!isStructuredWorkoutPlan(workoutPlan)) {
    return [];
  }

  return workoutPlan.treinos
    .filter((treino) => treino && Array.isArray(treino.exercicios))
    .map((treino) => {
      const blockName = String(treino?.dia || "").trim().toUpperCase();
      const blockSuffix = String(treino?.nome || "").trim();
      const blockLabel = blockSuffix
        ? `Treino ${blockName || "A"} - ${blockSuffix}`
        : `Treino ${blockName || "A"}`;

      const rows = treino.exercicios
        .filter((item) => item && item.nome)
        .map((item) => ({
          bloco: blockLabel,
          exercicio: String(item.nome || "-").trim() || "-",
          seriesReps: `${String(item.series ?? "-").trim()} x ${String(item.repeticoes || "-").trim()}`,
          carga: String(item.carga || "-").trim().toLowerCase(),
          grupoMuscular: String(item.grupoMuscular || "-").trim() || "-",
        }));

      return {
        bloco: blockLabel,
        rows,
        notes: [],
      };
    })
    .filter((section) => section.rows.length > 0);
}

function buildStructuredCardsSection(title, items, toneClass) {
  if (!Array.isArray(items) || items.length === 0) {
    return "";
  }

  return `
    <section class="rounded-2xl border border-white/20 bg-black/20 p-4 md:p-5">
      <h3 class="text-sm font-bold uppercase tracking-[0.18em] ${toneClass}">${escapeHtml(title)}</h3>
      <div class="advice-grid mt-3">
        ${items.map((item) => `<article class="advice-card">${escapeHtml(item)}</article>`).join("")}
      </div>
    </section>
  `;
}

function toStringList(items) {
  return Array.isArray(items)
    ? items.filter(Boolean).map((item) => String(item))
    : [];
}

function renderWorkoutRows(rows) {
  return rows.map((row) => `
    <tr>
      <td>${escapeHtml(row.exercicio)}</td>
      <td>${escapeHtml(row.seriesReps)}</td>
      <td><span class="workout-load workout-load-${escapeHtml(String(row.carga).toLowerCase())}">${escapeHtml(row.carga)}</span></td>
      <td>${escapeHtml(row.grupoMuscular)}</td>
    </tr>
  `).join("");
}

function renderWorkoutNotes(notes) {
  if (!Array.isArray(notes) || notes.length === 0) {
    return "";
  }

  return `
    <div class="workout-notes mt-3">
      ${notes.map((note) => `<p class="workout-note-item">${escapeHtml(note)}</p>`).join("")}
    </div>
  `;
}

function renderWorkoutBlock(section, includeNotes) {
  return `
    <section class="workout-block">
      <h4 class="workout-block-title">${escapeHtml(section.bloco)}</h4>
      <div class="workout-table-wrap mt-2">
        <table class="workout-table">
          <thead>
            <tr>
              <th>Exercício</th>
              <th>Séries x Repetições</th>
              <th>Carga</th>
              <th>Grupo Muscular</th>
            </tr>
          </thead>
          <tbody>${renderWorkoutRows(section.rows)}</tbody>
        </table>
      </div>
      ${includeNotes ? renderWorkoutNotes(section.notes) : ""}
    </section>
  `;
}

function renderWorkoutBlocks(sections, includeNotes = false) {
  return sections.map((section) => renderWorkoutBlock(section, includeNotes)).join("");
}

function setRetryButtonState(isLoading) {
  if (!retryRequestEl) {
    return;
  }

  if (isLoading) {
    retryRequestEl.setAttribute("disabled", "true");
    retryRequestEl.classList.add("is-loading");
    retryRequestEl.textContent = "Tentando novamente...";
    return;
  }

  retryRequestEl.removeAttribute("disabled");
  retryRequestEl.classList.remove("is-loading");
  retryRequestEl.textContent = "Tentar novamente";
}

function setLoadingMessage(message) {
  if (loadingTextEl) {
    loadingTextEl.textContent = message;
  }
}

function renderWorkoutContent(workoutPlan) {
  if (isStructuredWorkoutPlan(workoutPlan)) {
    const sections = extractWorkoutSectionsFromStructuredPlan(workoutPlan);
    const distribuicao = toStringList(workoutPlan.distribuicaoSemanal);
    const substituicoes = toStringList(workoutPlan.substituicoes);
    const dicas = toStringList(workoutPlan?.cards?.dicas);
    const comentarios = toStringList(workoutPlan?.cards?.comentarios);
    const observacoesFinais = String(workoutPlan.observacoesFinais || "").trim();
    const narrativaHtml = renderPlanNarrative(workoutPlan);
    const blockTablesHtml = renderWorkoutBlocks(sections, false);

    const trainingSectionHtml = sections.length > 0
      ? `
        <section class="rounded-2xl border border-white/20 bg-black/20 p-4 md:p-5">
          <h3 class="text-sm font-bold uppercase tracking-[0.18em] text-neonYellow">Treino em tabela</h3>
          <div class="mt-3 space-y-4">${blockTablesHtml}</div>
        </section>
      `
      : "";

    const distribuicaoSectionHtml = buildStructuredCardsSection("Distribuição semanal", distribuicao, "text-neonGreen");
    const substituicoesSectionHtml = buildStructuredCardsSection("Substituições inteligentes", substituicoes, "text-neonYellow");
    const dicasSectionHtml = buildStructuredCardsSection("Dicas finais", dicas, "text-neonGreen");
    const comentariosSectionHtml = buildStructuredCardsSection("Comentários para acompanhamento", comentarios, "text-neonYellow");
    const fechamentoHtml = observacoesFinais
      ? `
        <section class="rounded-2xl border border-white/20 bg-black/20 p-4 md:p-5">
          <h3 class="text-sm font-bold uppercase tracking-[0.18em] text-neonGreen">Fechamento profissional</h3>
          <article class="advice-card mt-3">${escapeHtml(observacoesFinais)}</article>
        </section>
      `
      : "";

    return `${narrativaHtml}${trainingSectionHtml}${distribuicaoSectionHtml}${substituicoesSectionHtml}${dicasSectionHtml}${comentariosSectionHtml}${fechamentoHtml}`;
  }

  const workoutPlanText = getWorkoutPlanText(workoutPlan);
  const sections = extractWorkoutSections(workoutPlanText);
  const rows = sections.flatMap((section) => section.rows);
  const adviceItems = extractAdviceItems(workoutPlanText);
  const normalizedPlan = normalizePlanText(workoutPlanText);

  if (rows.length === 0) {
    return `
      <section class="rounded-2xl border border-white/20 bg-black/20 p-4 md:p-5">
        <h3 class="text-sm font-bold uppercase tracking-[0.18em] text-neonYellow">Plano detalhado</h3>
        <pre class="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-white/90">${escapeHtml(normalizedPlan)}</pre>
      </section>
    `;
  }

  const blockTablesHtml = renderWorkoutBlocks(sections, true);

  const adviceHtml = adviceItems.length > 0
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
  renderClientGreeting(lastPayload);
  if (isStructuredWorkoutPlan(data?.workoutPlan)) {
    adjustmentCardEl?.classList.add("hidden");
    if (adjustmentCardEl) {
      adjustmentCardEl.innerHTML = "";
    }
  } else {
    renderAdjustmentCard(data, lastPayload);
  }
  renderAnalysisCards(data);
  renderSupportCards(data, lastPayload);

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
  const selected = getHistory().find((entry) => entry.id === itemId);
  if (!selected) return;

  lastPayload = selected.payload;
  lastResult = selected.result;
  renderWorkoutResult(selected.result);
}

function renderHistoryList() {
  if (!historySectionEl || !historyListEl) return;

  const history = getHistory();
  if (history.length === 0) {
    historySectionEl.classList.add("hidden");
    historyListEl.innerHTML = "";
    return;
  }

  historySectionEl.classList.remove("hidden");
  historyListEl.innerHTML = history.map((item) => {
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
  }).join("");

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
  if (!networkStatusEl) return;

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
  setRetryButtonState(true);

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
    localStorage.setItem("workoutResult", JSON.stringify(data));
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
      setLoadingMessage("Sem internet. Vamos gerar seu plano automaticamente quando a conexão voltar...");
      errorEl?.classList.add("hidden");
      renderNetworkStatus();
      renderHistoryList();
      return;
    }

    loadingEl?.classList.add("hidden");
    errorEl?.classList.remove("hidden");
    if (errorMessageEl) {
      errorMessageEl.textContent = error instanceof Error && error.message
        ? error.message
        : "Não foi possível gerar seu plano agora. Revise os dados e tente novamente.";
    }
  } finally {
    isRequestInFlight = false;
    setRetryButtonState(false);
  }
}

window.addEventListener("offline", () => {
  renderNetworkStatus();
});

window.addEventListener("online", async () => {
  renderNetworkStatus();

  if (hasPendingWorkoutRequest) {
    setLoadingMessage("Conexão detectada. Estamos gerando seu plano agora...");
    await requestWorkout();
    return;
  }

  const localHistory = getHistory();
  if (localHistory.length > 0) {
    await syncModule.syncHistoryWithServer(localHistory);
    renderHistoryList();
  }
});

retryRequestEl?.addEventListener("click", () => {
  loadingEl?.classList.remove("hidden");
  errorEl?.classList.add("hidden");
  setLoadingMessage("Gerando seu plano personalizado...");
  requestWorkout();
});

clearHistoryEl?.addEventListener("click", () => {
  if (!window.confirm("Deseja realmente limpar o histórico offline desta tela?")) {
    return;
  }

  localStorage.removeItem(HISTORY_KEY);
  renderHistoryList();
});

window.__resultPageTestApi = {
  normalizePlanText,
  normalizeWorkoutLine,
  normalizeTextForPattern,
  extractSeriesReps,
  extractCarga,
  parseExerciseLine,
  parseWorkoutNote,
  extractWorkoutSections,
  extractWorkoutRows,
  renderWorkoutContent,
};

renderHistoryList();

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
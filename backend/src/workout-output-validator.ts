import { ClientProfile } from "./types.js";

interface ValidationResult {
  ok: boolean;
  issues: string[];
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function hasAnyPattern(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function hasRequiredSections(normalized: string): string[] {
  const checks: Array<{ label: string; patterns: RegExp[] }> = [
    { label: "analise da cliente", patterns: [/analise da cliente/, /\bimc\b/] },
    { label: "ajuste de objetivo", patterns: [/ajuste de objetivo/, /objetivo foi mantido/, /objetivo inicial/] },
    { label: "estrategia da ficha", patterns: [/estrategia da ficha/, /divisao foi escolhida/] },
    { label: "estrutura do ciclo", patterns: [/estrutura do ciclo/, /semanal|quinzenal|mensal/] },
    { label: "ficha detalhada", patterns: [/treino a/] },
    { label: "distribuicao por dias", patterns: [/distribuicao por dias/, /segunda|terca|quarta|quinta|sexta|sabado|domingo/] },
    { label: "substituicoes inteligentes", patterns: [/substituicoes inteligentes/, /substituicoes/] },
    { label: "dicas finais", patterns: [/dicas finais/, /\b1\)|\b2\)/] },
    { label: "comentarios curtos para cards", patterns: [/comentarios curtos para cards/, /cards/] },
    { label: "fechamento profissional", patterns: [/fechamento profissional/, /evolucao progressiva|consistencia|seguranca/] },
  ];

  return checks
    .filter((check) => !hasAnyPattern(normalized, check.patterns))
    .map((check) => `Seção obrigatória ausente: ${check.label}.`);
}

function validateExerciseLineFormat(lines: string[]): string[] {
  const validExerciseLine = /^.{3,}\s-\s\d+\s*(?:series?)?x\d+(?:\s*(?:a|-)\s*\d+)?\s-\scarga\s(?:leve|moderada|alta)\s\([^)]+\)\s*$/i;
  const exerciseLines = lines.filter((line) => /\scarga\s(?:leve|moderada|alta)\b/i.test(line));

  if (exerciseLines.length === 0) {
    return ["Nenhuma linha de exercício com carga (leve/moderada/alta) foi encontrada."];
  }

  const invalidExerciseLines = exerciseLines.filter((line) => !validExerciseLine.test(line));
  if (invalidExerciseLines.length > 0) {
    return ["Há linhas de exercício fora do formato esperado: Exercício - 3x10 a 12 - carga moderada (grupo muscular)."];
  }

  return [];
}

function validateEmphasisLine(normalized: string, profile: ClientProfile): string[] {
  const needsEmphasis =
    (profile.nivel === "intermediario" || profile.nivel === "avancado")
    && (profile.objetivo === "hipertrofia" || profile.objetivo === "definicao")
    && profile.focoTreino
    && profile.focoTreino !== "nenhum";

  if (!needsEmphasis) {
    return [];
  }

  const hasLine = /enfase aplicada\s*:\s*(quadriceps|gluteo|posteriores|costas|peito)/.test(normalized);
  return hasLine ? [] : ["Linha obrigatória ausente: Enfase aplicada: <foco escolhido>."];
}

export function validateWorkoutOutput(workoutPlan: string, profile: ClientProfile): ValidationResult {
  const trimmedPlan = String(workoutPlan || "").trim();
  if (!trimmedPlan) {
    return { ok: false, issues: ["A IA retornou conteúdo vazio."] };
  }

  const normalized = normalizeText(trimmedPlan);
  const lines = trimmedPlan
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const issues = [
    ...hasRequiredSections(normalized),
    ...validateExerciseLineFormat(lines),
    ...validateEmphasisLine(normalized, profile),
  ];

  return {
    ok: issues.length === 0,
    issues,
  };
}

export function buildComplianceRetryInstruction(issues: string[]): string {
  const normalizedIssues = Array.from(new Set(issues)).slice(0, 8);

  return [
    "ATENCAO: Sua resposta anterior não está totalmente aderente ao formato obrigatório.",
    "Reescreva a resposta inteira do zero, mantendo coerência clínica e respeitando TODAS as regras.",
    "Corrija obrigatoriamente os pontos abaixo:",
    ...normalizedIssues.map((issue, index) => `${index + 1}) ${issue}`),
    "Importante: mantenha as 10 seções, inclua exercícios no formato padronizado e use linguagem profissional.",
  ].join("\n");
}

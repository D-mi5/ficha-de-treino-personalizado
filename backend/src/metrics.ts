import { ClientProfile, Intensidade } from "./types.js";
import { calcularIMC } from "./utils.js";
import { CLINICAL_RULES } from "./clinical-rules.js";

export interface ProfileAnalysis {
  imc: number;
  classificacaoImc: string;
  intensidadeSugerida: Intensidade;
  progressaoSemanal: string;
  contextoClinico: string;
  mensagemAjuste: string | null;
}

interface ClinicalFlags {
  idosa: boolean;
  obesidade: boolean;
  desnutricao: boolean;
  riscoArticular: boolean;
  comorbidade: boolean;
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getClinicalFlags(profile: ClientProfile, imc: number): ClinicalFlags {
  const notes = normalizeText(profile.observacoes || "");

  const riscoArticular = new RegExp(CLINICAL_RULES.riscoArticularPattern).test(notes);
  const comorbidade = new RegExp(CLINICAL_RULES.comorbidadePattern).test(notes);

  return {
    idosa: profile.idade >= CLINICAL_RULES.idadeIdosaMinima,
    obesidade: imc >= CLINICAL_RULES.imcObesidade,
    desnutricao: imc < CLINICAL_RULES.imcDesnutricao,
    riscoArticular,
    comorbidade,
  };
}

function normalizeClassification(classification: string): string {
  const map: Record<string, string> = {
    normal: "peso adequado",
  };
  return map[classification] || classification;
}

export function getIntensidade(idade: number, imc: number): Intensidade {
  if (idade >= CLINICAL_RULES.idadeIdosaMinima) return "leve";
  if (imc >= CLINICAL_RULES.imcObesidadeGrave) return "leve";
  if (imc >= CLINICAL_RULES.imcObesidade) return "moderada";
  if (idade <= CLINICAL_RULES.idadeJovemIntensaMax) return "intensa";
  if (idade <= CLINICAL_RULES.idadeAdultaModeradaMax) return "moderada";
  return "leve";
}

function suggestIntensity(profile: ClientProfile, imc: number): Intensidade {
  const flags = getClinicalFlags(profile, imc);

  if (flags.idosa) return "leve";
  if (flags.comorbidade || flags.riscoArticular) return "leve";
  if (imc >= CLINICAL_RULES.imcObesidadeGrave) return "leve";
  if (imc >= CLINICAL_RULES.imcObesidade) return "moderada";
  if (imc < CLINICAL_RULES.imcDesnutricao) return "leve";
  if (profile.nivel === "iniciante") return "leve";
  if (profile.nivel === "intermediario") return "moderada";
  if (profile.nivel === "avancado") {
    return profile.idade <= CLINICAL_RULES.idadeAvancadoIntensaMax ? "intensa" : "moderada";
  }

  return getIntensidade(profile.idade, imc);
}

function suggestProgression(profile: ClientProfile, intensidade: Intensidade, imc: number): string {
  const flags = getClinicalFlags(profile, imc);

  if (flags.comorbidade) {
    return "Progressão clínica conservadora. Aumentar carga apenas após 2 semanas de boa adaptação, monitorando pressão arterial, fadiga e sintomas. Priorizar regularidade e técnica.";
  }

  if (flags.riscoArticular) {
    return "Progressão protetiva articular. Evoluir 1% a 3% por semana, sem dor durante ou após o treino. Priorizar amplitude confortável, controle de movimento e fortalecimento estabilizador.";
  }

  if (flags.idosa) {
    return "Progressão funcional para longevidade. Evoluir gradualmente (1% a 3% por semana), com foco em equilíbrio, mobilidade, força básica e prevenção de quedas.";
  }

  if (imc >= CLINICAL_RULES.imcRiscoMaximo) {
    return "Progressão extremamente gradual. Priorizar adaptação neuromuscular e mobilidade. Aumentar carga apenas quando execução estiver totalmente segura e sem desconforto articular.";
  }

  if (imc >= CLINICAL_RULES.imcObesidade) {
    return "Progressão gradual com foco em consistência. Aumentar carga de 2% a 4% por semana apenas se não houver dor ou fadiga excessiva.";
  }

  if (imc < CLINICAL_RULES.imcDesnutricao) {
    return "Progressão focada em ganho de massa muscular. Aumentar carga de forma progressiva e priorizar recuperação e ingestão calórica adequada.";
  }

  const base =
    intensidade === "leve"
      ? "Aumentar carga de 2% a 4% por semana quando completar todas as repetições com técnica limpa."
      : intensidade === "moderada"
        ? "Aumentar carga de 3% a 5% por semana nas principais alavancas mantendo controle técnico."
        : "Aumentar carga de 4% a 6% por semana em exercícios compostos, com deload a cada 4-6 semanas.";

  if (profile.idade >= CLINICAL_RULES.idadeRecuperacaoArticularMin) {
    return `${base} Priorizar recuperação articular e evitar progressão em semanas de dor ou fadiga elevada.`;
  }

  return base;
}

export function resolveObjectiveConflict(
  idade: number,
  imc: number,
  objetivo: string,
): { objetivoAjustado: string; motivo: string | null } {
  if (idade >= CLINICAL_RULES.idadeIdosaMinima && imc >= CLINICAL_RULES.imcObesidade) {
    return {
      objetivoAjustado: "emagrecimento",
      motivo: "Idade avançada associada à obesidade aumenta risco cardiovascular e articular",
    };
  }

  if (imc >= CLINICAL_RULES.imcObesidade && (objetivo === "hipertrofia" || objetivo === "definicao")) {
    return {
      objetivoAjustado: "emagrecimento",
      motivo: "IMC elevado não é compatível com foco em hipertrofia/definição neste momento",
    };
  }

  if (imc >= CLINICAL_RULES.imcObesidadeGrave) {
    return {
      objetivoAjustado: "emagrecimento",
      motivo: "Obesidade grau II/III exige foco inicial em redução de peso com segurança",
    };
  }

  if (imc < CLINICAL_RULES.imcDesnutricao && objetivo === "emagrecimento") {
    return {
      objetivoAjustado: "hipertrofia",
      motivo: "Baixo peso contraindica estratégias de emagrecimento",
    };
  }

  return { objetivoAjustado: objetivo, motivo: null };
}

function buildClinicalContext(imc: number, profile: ClientProfile): string {
  const flags = getClinicalFlags(profile, imc);
  const notes: string[] = [];

  if (flags.idosa) {
    notes.push("Cliente idosa. Prioridade absoluta em segurança, mobilidade, equilíbrio e prevenção de quedas.");
  }

  if (flags.obesidade) {
    if (imc >= CLINICAL_RULES.imcRiscoMaximo) {
      notes.push("Obesidade grau III. Risco elevado. Treino deve ser leve, com foco em mobilidade e adaptação.");
    } else if (imc >= CLINICAL_RULES.imcObesidadeGrave) {
      notes.push("Obesidade grau II. Necessário controle rigoroso de carga e impacto.");
    } else {
      notes.push("Obesidade grau I. Foco em emagrecimento com preservação muscular.");
    }
  }

  if (flags.desnutricao) {
    notes.push("Baixo peso. Prioridade em ganho de massa muscular e suporte nutricional.");
  }

  if (flags.riscoArticular) {
    notes.push("Risco articular identificado. Evitar impacto, priorizar máquinas e execução controlada.");
  }

  if (flags.comorbidade) {
    notes.push("Possível comorbidade. Treino deve ser conservador com monitoramento.");
  }

  const isSaudavel = !flags.idosa && !flags.obesidade && !flags.desnutricao && !flags.riscoArticular && !flags.comorbidade;
  if (isSaudavel) {
    return "Cliente sem limitações clínicas relevantes. Apta para treino estruturado conforme objetivo, com progressão normal e foco em desempenho e estética.";
  }

  notes.push("Recomendado acompanhamento com médico e nutricionista para maior segurança clínica.");
  return notes.join(" ");
}

export function resolverObjetivo(
  objetivoCliente: string,
  imc: number,
): { objetivoFinal: string; motivo: string | null } {
  if (imc >= CLINICAL_RULES.imcObesidade && (objetivoCliente === "hipertrofia" || objetivoCliente === "definicao")) {
    return {
      objetivoFinal: "emagrecimento",
      motivo: "IMC elevado exige foco inicial em redução de gordura para segurança e saúde.",
    };
  }

  if (imc < CLINICAL_RULES.imcDesnutricao && objetivoCliente === "emagrecimento") {
    return {
      objetivoFinal: "hipertrofia",
      motivo: "Baixo peso exige foco em ganho de massa muscular e recuperação nutricional.",
    };
  }

  return { objetivoFinal: objetivoCliente, motivo: null };
}

export function adjustTrainingDays(
  dias: number,
  profile: ClientProfile,
  imc: number,
): { diasAjustados: number; motivo: string | null } {
  const flags = getClinicalFlags(profile, imc);

  if (flags.idosa || imc >= CLINICAL_RULES.imcRiscoMaximo || flags.comorbidade) {
    const ajustado = Math.min(dias, 3);
    return {
      diasAjustados: ajustado,
      motivo: ajustado < dias ? "Perfil de alto risco exige menor frequência para recuperação adequada." : null,
    };
  }

  if (imc >= CLINICAL_RULES.imcObesidade) {
    const ajustado = Math.min(dias, 4);
    return {
      diasAjustados: ajustado,
      motivo: ajustado < dias ? "Obesidade exige frequência controlada para evitar sobrecarga articular." : null,
    };
  }

  if (profile.nivel === "iniciante") {
    const ajustado = Math.min(dias, 4);
    return {
      diasAjustados: ajustado,
      motivo: ajustado < dias ? "Nível iniciante exige período maior de recuperação entre os treinos." : null,
    };
  }

  return { diasAjustados: dias, motivo: null };
}

function buildMensagemAjuste(
  objetivoOriginal: string,
  objetivoAjustado: string,
  motivo: string | null,
): string | null {
  if (!motivo || objetivoOriginal === objetivoAjustado) {
    return null;
  }

  return `⚠️ Seu objetivo inicial era ${objetivoOriginal}, porém foi ajustado para ${objetivoAjustado} visando sua segurança e saúde. Motivo: ${motivo}. Recomendamos acompanhamento com médico e nutricionista.`;
}

export function analyzeProfile(profile: ClientProfile): ProfileAnalysis {
  const { imc, classificacao } = calcularIMC(profile.peso, profile.altura);
  const intensidadeSugerida = suggestIntensity(profile, imc);
  const conflito = resolveObjectiveConflict(profile.idade, imc, profile.objetivo);
  const mensagemAjuste = buildMensagemAjuste(profile.objetivo, conflito.objetivoAjustado, conflito.motivo);

  return {
    imc,
    classificacaoImc: normalizeClassification(classificacao),
    intensidadeSugerida,
    progressaoSemanal: suggestProgression(profile, intensidadeSugerida, imc),
    contextoClinico: buildClinicalContext(imc, profile),
    mensagemAjuste,
  };
}

import { ClientProfile } from "./types.js";

export type Intensidade = "leve" | "moderada" | "intensa";

export interface ProfileAnalysis {
  imc: number;
  classificacaoImc: string;
  intensidadeSugerida: Intensidade;
  progressaoSemanal: string;
}

function classifyImc(imc: number): string {
  if (imc < 18.5) return "baixo peso";
  if (imc < 25) return "peso adequado";
  if (imc < 30) return "sobrepeso";
  if (imc < 35) return "obesidade grau I";
  if (imc < 40) return "obesidade grau II";
  return "obesidade grau III";
}

function suggestIntensity(profile: ClientProfile): Intensidade {
  if (profile.nivel === "iniciante") return "leve";

  if (profile.nivel === "intermediario") {
    return profile.objetivo === "emagrecimento" ? "moderada" : "intensa";
  }

  return profile.idade >= 40 ? "moderada" : "intensa";
}

function suggestProgression(profile: ClientProfile, intensidade: Intensidade): string {
  const base =
    intensidade === "leve"
      ? "Aumentar carga de 2% a 4% por semana quando completar todas as repeticoes com tecnica limpa."
      : intensidade === "moderada"
        ? "Aumentar carga de 3% a 5% por semana nas principais alavancas e manter controle de execucao."
        : "Aumentar carga de 4% a 6% por semana em exercicios compostos, com deload a cada 4-6 semanas.";

  if (profile.idade >= 40) {
    return `${base} Para 40+, priorizar recuperacao articular e evitar progressao em semanas de dor ou fadiga alta.`;
  }

  return base;
}

export function analyzeProfile(profile: ClientProfile): ProfileAnalysis {
  const rawImc = profile.peso / (profile.altura * profile.altura);
  const imc = Number(rawImc.toFixed(1));
  const intensidadeSugerida = suggestIntensity(profile);

  return {
    imc,
    classificacaoImc: classifyImc(imc),
    intensidadeSugerida,
    progressaoSemanal: suggestProgression(profile, intensidadeSugerida),
  };
}

export type Objetivo = "emagrecimento" | "hipertrofia" | "definicao";
export type Nivel = "iniciante" | "intermediario" | "avancado";
export type Intensidade = "leve" | "moderada" | "intensa";

export interface ClientProfile {
  idade: number;
  peso: number;
  altura: number;
  objetivo: Objetivo;
  nivel: Nivel;
  diasSemana: number;
  observacoes?: string;
}

export interface WorkoutAnalysis {
  imc: number;
  classificacaoImc: string;
  intensidadeSugerida: Intensidade;
  progressaoSemanal: string;
  contextoClinico?: string;
  mensagemAjuste?: string | null;
}

export interface WorkoutResponse {
  workoutPlan: string;
  analysis: WorkoutAnalysis;
}

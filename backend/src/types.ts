export type Objetivo = "emagrecimento" | "hipertrofia" | "definicao";
export type Nivel = "iniciante" | "intermediario" | "avancado";
export type Intensidade = "leve" | "moderada" | "intensa";
export type FocoTreino = "nenhum" | "quadriceps" | "gluteo" | "posteriores" | "costas" | "peito";
export type PeriodicidadeFicha = "semanal" | "quinzenal" | "mensal";
export type NivelRisco = "baixo" | "moderado" | "alto";
export type TecnicaAvancada = "superserie" | "bi-set" | "tri-set" | "rest-pause" | "drop-set" | "piramide" | "serie combinada";
export type GenerationSource = "ai" | "fallback-local";
export type GenerationFallbackReason = "provider-unavailable" | "timeout" | "invalid-output" | "missing-credentials" | "unknown";

export interface WorkoutExercise {
  nome: string;
  series: number;
  repeticoes: string;
  carga: "leve" | "moderada" | "alta";
  grupoMuscular: string;
  tecnicaAvancada?: TecnicaAvancada;
}

export interface WorkoutBlock {
  dia: string;
  nome: string;
  exercicios: WorkoutExercise[];
}

export interface WorkoutCards {
  comentarios: string[];
  dicas: string[];
}

export interface StructuredWorkoutPlan {
  analise: string;
  ajusteObjetivo: string;
  estrategia: string;
  ciclo: string;
  treinos: WorkoutBlock[];
  distribuicaoSemanal: string[];
  substituicoes: string[];
  cards: WorkoutCards;
  observacoesFinais: string;
}

export interface ClientProfile {
  nome?: string;
  idade: number;
  peso: number;
  altura: number;
  objetivo: Objetivo;
  nivel: Nivel;
  focoTreino?: FocoTreino;
  diasSemana: number;
  periodicidade?: PeriodicidadeFicha;
  observacoes?: string;
}

export interface WorkoutAnalysis {
  imc: number;
  classificacaoImc: string;
  intensidadeSugerida: Intensidade;
  progressaoSemanal: string;
  contextoClinico: string;
  mensagemAjuste: string | null;
  objetivoFinal: Objetivo;
  diasTreinoAjustados: number;
  motivoAjusteDiasTreino: string | null;
  nivelRisco: NivelRisco;
  comentariosEssenciais: string[];
}

export interface WorkoutResponse {
  workoutPlan: string | StructuredWorkoutPlan;
  analysis: WorkoutAnalysis;
  generationMeta?: {
    source: GenerationSource;
    provider?: "openai" | "gemini";
    model?: string;
    attempts?: number;
    fallbackReason?: GenerationFallbackReason;
  };
}

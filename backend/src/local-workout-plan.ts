import { ClientProfile, StructuredWorkoutPlan, WorkoutAnalysis, WorkoutBlock, WorkoutExercise, WorkoutResponse } from "./types.js";

type WorkoutLoad = WorkoutExercise["carga"];

interface WorkoutTemplate {
  nome: string;
  grupoMuscular: string;
}

const WEEK_DAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const EXERCISE_LIBRARY: Record<string, WorkoutTemplate[]> = {
  quadriceps: [
    { nome: "Cadeira extensora", grupoMuscular: "quadriceps" },
    { nome: "Leg press", grupoMuscular: "quadriceps" },
    { nome: "Hack machine", grupoMuscular: "quadriceps" },
    { nome: "Agachamento guiado", grupoMuscular: "quadriceps" },
    { nome: "Afundo no smith", grupoMuscular: "quadriceps" },
  ],
  gluteo: [
    { nome: "Elevação pélvica", grupoMuscular: "gluteos" },
    { nome: "Coice na polia", grupoMuscular: "gluteos" },
    { nome: "Abdução de quadril", grupoMuscular: "gluteos" },
    { nome: "Agachamento sumô", grupoMuscular: "gluteos" },
    { nome: "Passada com halteres", grupoMuscular: "gluteos" },
  ],
  posteriores: [
    { nome: "Stiff com halteres", grupoMuscular: "posteriores" },
    { nome: "Mesa flexora", grupoMuscular: "posteriores" },
    { nome: "Levantamento romeno", grupoMuscular: "posteriores" },
    { nome: "Glute bridge", grupoMuscular: "posteriores" },
    { nome: "Cadeira flexora", grupoMuscular: "posteriores" },
  ],
  costas: [
    { nome: "Puxada na frente", grupoMuscular: "costas" },
    { nome: "Remada baixa", grupoMuscular: "costas" },
    { nome: "Pulldown na polia", grupoMuscular: "costas" },
    { nome: "Remada unilateral", grupoMuscular: "costas" },
    { nome: "Face pull", grupoMuscular: "costas" },
  ],
  peito: [
    { nome: "Supino máquina", grupoMuscular: "peito" },
    { nome: "Crucifixo máquina", grupoMuscular: "peito" },
    { nome: "Supino com halteres", grupoMuscular: "peito" },
    { nome: "Peck deck", grupoMuscular: "peito" },
  ],
  ombros: [
    { nome: "Desenvolvimento com halteres", grupoMuscular: "ombros" },
    { nome: "Elevação lateral", grupoMuscular: "ombros" },
    { nome: "Elevação frontal", grupoMuscular: "ombros" },
  ],
  core: [
    { nome: "Prancha", grupoMuscular: "abdomen" },
    { nome: "Abdominal infra", grupoMuscular: "abdomen" },
    { nome: "Abdominal máquina", grupoMuscular: "abdomen" },
  ],
  panturrilhas: [
    { nome: "Panturrilha em pé", grupoMuscular: "panturrilhas" },
    { nome: "Panturrilha sentada", grupoMuscular: "panturrilhas" },
  ],
  cardio: [
    { nome: "Caminhada inclinada", grupoMuscular: "cardiorrespiratorio" },
    { nome: "Bicicleta ergométrica", grupoMuscular: "cardiorrespiratorio" },
    { nome: "Elíptico moderado", grupoMuscular: "cardiorrespiratorio" },
  ],
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getSeries(profile: ClientProfile, analysis: WorkoutAnalysis): number {
  if (analysis.nivelRisco === "alto") return 2;
  if (profile.nivel === "avancado" && analysis.intensidadeSugerida !== "leve") return 4;
  return 3;
}

function getRepeticoes(profile: ClientProfile, analysis: WorkoutAnalysis): string {
  if (analysis.nivelRisco === "alto") return "10 a 12";
  if (analysis.objetivoFinal === "hipertrofia") return profile.nivel === "avancado" ? "8 a 10" : "8 a 12";
  if (analysis.objetivoFinal === "definicao") return "10 a 15";
  return "12 a 15";
}

function getCarga(profile: ClientProfile, analysis: WorkoutAnalysis): WorkoutLoad {
  if (analysis.nivelRisco === "alto") return "leve";
  if (analysis.intensidadeSugerida === "intensa" && profile.nivel === "avancado") return "alta";
  if (analysis.intensidadeSugerida === "moderada") return "moderada";
  return "leve";
}

function dedupeTemplates(templates: WorkoutTemplate[]): WorkoutTemplate[] {
  const unique = new Map<string, WorkoutTemplate>();
  templates.forEach((item) => unique.set(item.nome, item));
  return Array.from(unique.values());
}

function toExercises(templates: WorkoutTemplate[], profile: ClientProfile, analysis: WorkoutAnalysis): WorkoutExercise[] {
  const series = getSeries(profile, analysis);
  const repeticoes = getRepeticoes(profile, analysis);
  const carga = getCarga(profile, analysis);

  return dedupeTemplates(templates)
    .slice(0, 6)
    .map((item) => ({
      nome: item.nome,
      series,
      repeticoes,
      carga,
      grupoMuscular: item.grupoMuscular,
    }));
}

function getFocusGroup(profile: ClientProfile): string | null {
  if (!profile.focoTreino || profile.focoTreino === "nenhum") {
    return null;
  }

  return profile.focoTreino;
}

function buildWorkoutTemplates(days: number, profile: ClientProfile, analysis: WorkoutAnalysis): Array<{ dia: string; nome: string; grupos: string[] }> {
  const focus = getFocusGroup(profile);

  if (days <= 2) {
    return [
      { dia: "A", nome: focus === "gluteo" ? "Inferiores com ênfase em glúteos" : "Inferiores completos", grupos: [focus || "quadriceps", "posteriores", "gluteo", "panturrilhas"] },
      { dia: "B", nome: "Superiores completos", grupos: [focus === "costas" || focus === "peito" ? focus : "costas", "peito", "ombros", "core"] },
    ];
  }

  if (days === 3) {
    return [
      { dia: "A", nome: focus === "quadriceps" ? "Quadríceps e glúteos" : focus === "gluteo" ? "Glúteos e quadríceps" : "Inferiores 1", grupos: [focus || "quadriceps", "gluteo", "panturrilhas"] },
      { dia: "B", nome: "Superiores estratégicos", grupos: [focus === "costas" || focus === "peito" ? focus : "costas", "peito", "ombros"] },
      { dia: "C", nome: focus === "posteriores" ? "Posteriores e core" : "Inferiores 2 e core", grupos: [focus === "posteriores" ? "posteriores" : "posteriores", "gluteo", "core", analysis.objetivoFinal === "emagrecimento" ? "cardio" : "core"] },
    ];
  }

  if (days === 4) {
    return [
      { dia: "A", nome: focus === "gluteo" ? "Glúteos prioritários" : focus === "quadriceps" ? "Quadríceps prioritários" : "Inferiores anteriores", grupos: [focus === "costas" || focus === "peito" ? "quadriceps" : focus || "quadriceps", "gluteo", "panturrilhas"] },
      { dia: "B", nome: focus === "costas" ? "Costas prioritárias" : focus === "peito" ? "Peito prioritário" : "Superiores 1", grupos: [focus === "costas" || focus === "peito" ? focus : "costas", "ombros", "core"] },
      { dia: "C", nome: "Posteriores e glúteos", grupos: ["posteriores", "gluteo", analysis.objetivoFinal === "emagrecimento" ? "cardio" : "core"] },
      { dia: "D", nome: "Superiores 2 e acabamento", grupos: ["costas", "peito", "ombros", "core"] },
    ];
  }

  return [
    { dia: "A", nome: focus === "gluteo" ? "Glúteos prioritários" : focus === "quadriceps" ? "Quadríceps prioritários" : "Inferiores 1", grupos: [focus === "costas" || focus === "peito" ? "quadriceps" : focus || "quadriceps", "gluteo", "panturrilhas"] },
    { dia: "B", nome: focus === "costas" ? "Costas prioritárias" : focus === "peito" ? "Peito prioritário" : "Superiores 1", grupos: [focus === "costas" || focus === "peito" ? focus : "costas", "peito", "ombros"] },
    { dia: "C", nome: "Posteriores e core", grupos: ["posteriores", "gluteo", "core"] },
    { dia: "D", nome: "Superiores 2", grupos: ["costas", "peito", "ombros", "core"] },
    { dia: "E", nome: analysis.objetivoFinal === "emagrecimento" ? "Condicionamento e inferiores leves" : "Acabamento e estabilidade", grupos: [analysis.objetivoFinal === "emagrecimento" ? "cardio" : "core", "quadriceps", "gluteo"] },
  ].slice(0, days);
}

function buildWorkoutBlocks(profile: ClientProfile, analysis: WorkoutAnalysis): WorkoutBlock[] {
  const adjustedDays = clamp(analysis.diasTreinoAjustados || profile.diasSemana, 2, 5);
  const templates = buildWorkoutTemplates(adjustedDays, profile, analysis);

  return templates.map((template) => {
    const exercises = template.grupos.flatMap((group) => EXERCISE_LIBRARY[group] || []).slice(0, 7);
    return {
      dia: template.dia,
      nome: template.nome,
      exercicios: toExercises(exercises, profile, analysis),
    };
  });
}

function buildDistribuicaoSemanal(blocks: WorkoutBlock[]): string[] {
  return blocks.map((block, index) => `${WEEK_DAYS[index] || `Dia ${index + 1}`}: Treino ${block.dia} - ${block.nome}`);
}

function buildSubstituicoes(profile: ClientProfile, analysis: WorkoutAnalysis): string[] {
  const substitutions = [
    "Se não houver leg press, usar agachamento guiado com amplitude segura.",
    "Se a elevação pélvica estiver desconfortável, trocar por glute bridge com pausa de 2 segundos no topo.",
    "Se houver desconforto lombar em exercícios livres, priorizar máquina ou apoio guiado.",
  ];

  if (analysis.nivelRisco !== "baixo") {
    substitutions.push("Se houver dor articular no dia, reduzir carga e substituir por variações em máquina com execução controlada.");
  }

  if (profile.objetivo === "emagrecimento" || analysis.objetivoFinal === "emagrecimento") {
    substitutions.push("Cardio pode ser feito em bicicleta ou elíptico caso a caminhada inclinada aumente impacto articular.");
  }

  return substitutions.slice(0, 4);
}

function buildCards(profile: ClientProfile, analysis: WorkoutAnalysis) {
  const comentarios = [
    analysis.comentariosEssenciais[0] || "Mantenha execução limpa e progressão gradual.",
    analysis.comentariosEssenciais[1] || "Controle a carga e respeite os intervalos para evoluir com segurança.",
    `Intensidade atual: ${analysis.intensidadeSugerida}.`,
  ].filter(Boolean).slice(0, 4);

  const dicas = [
    "Faça 5 a 10 minutos de aquecimento antes do primeiro treino principal.",
    "Inclua 1 a 2 séries leves de adaptação no primeiro exercício do dia.",
    "Mantenha hidratação durante o treino e recuperação adequada ao longo da semana.",
    profile.nivel === "iniciante"
      ? "Priorize técnica, mobilidade e constância antes de buscar cargas maiores."
      : "Aumente carga apenas quando completar todas as repetições com ótima execução.",
  ].slice(0, 5);

  return { comentarios, dicas };
}

function buildCycleText(profile: ClientProfile, analysis: WorkoutAnalysis): string {
  if (profile.periodicidade === "mensal") {
    return `Ciclo mensal com progressão simples por 4 semanas. Semana 1 com adaptação técnica, semanas 2 e 3 com aumento gradual de carga, e semana 4 consolidando execução com controle de fadiga. ${analysis.progressaoSemanal}`;
  }

  if (profile.periodicidade === "quinzenal") {
    return `Ciclo quinzenal com execução estável na primeira semana e progressão leve de carga ou repetições na segunda semana, respeitando recuperação e segurança. ${analysis.progressaoSemanal}`;
  }

  return `Ciclo semanal objetivo para execução imediata, com foco em consistência, técnica e segurança. ${analysis.progressaoSemanal}`;
}

function toDisplayName(value: string | undefined): string {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return "";
  }

  return normalized
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function buildAnalise(profile: ClientProfile, analysis: WorkoutAnalysis): string {
  const displayName = toDisplayName(profile.nome);
  const nome = displayName ? `${displayName} apresenta` : "A cliente apresenta";
  return `${nome} perfil com objetivo final em ${analysis.objetivoFinal}, IMC ${analysis.imc} (${analysis.classificacaoImc}), intensidade sugerida ${analysis.intensidadeSugerida} e leitura clínica de ${analysis.contextoClinico}`;
}

function buildAjusteObjetivo(profile: ClientProfile, analysis: WorkoutAnalysis): string {
  if (analysis.mensagemAjuste) {
    return analysis.mensagemAjuste;
  }

  return `Objetivo mantido em ${analysis.objetivoFinal}, respeitando nível ${profile.nivel}, frequência semanal e margem de recuperação atual.`;
}

function buildStrategy(profile: ClientProfile, analysis: WorkoutAnalysis, blocks: WorkoutBlock[]): string {
  const focus = getFocusGroup(profile);
  const emphasisText = focus ? ` Ênfase aplicada: ${focus}.` : "";
  return `A divisão com ${blocks.length} treinos foi escolhida para equilibrar objetivo, nível ${profile.nivel}, periodicidade ${profile.periodicidade || "semanal"} e segurança clínica. O plano prioriza recuperação coerente, exercícios reais de academia e progressão compatível com ${analysis.nivelRisco === "alto" ? "maior cautela clínica" : "boa margem de evolução"}.${emphasisText}`;
}

function buildObservacoesFinais(analysis: WorkoutAnalysis): string {
  return `Mantenha constância, técnica segura e evolução progressiva. Se houver dor persistente, fadiga fora do normal ou piora clínica, ajuste a carga e busque orientação profissional. ${analysis.progressaoSemanal}`;
}

export function buildLocalWorkoutFallback(profile: ClientProfile, analysis: WorkoutAnalysis): WorkoutResponse {
  const treinos = buildWorkoutBlocks(profile, analysis);
  const workoutPlan: StructuredWorkoutPlan = {
    analise: buildAnalise(profile, analysis),
    ajusteObjetivo: buildAjusteObjetivo(profile, analysis),
    estrategia: buildStrategy(profile, analysis, treinos),
    ciclo: buildCycleText(profile, analysis),
    treinos,
    distribuicaoSemanal: buildDistribuicaoSemanal(treinos),
    substituicoes: buildSubstituicoes(profile, analysis),
    cards: buildCards(profile, analysis),
    observacoesFinais: buildObservacoesFinais(analysis),
  };

  return {
    workoutPlan,
    analysis,
  };
}
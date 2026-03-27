import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

function createMockElement() {
  return {
    innerHTML: "",
    textContent: "",
    className: "",
    classList: {
      add: vi.fn(),
      remove: vi.fn(),
      toggle: vi.fn(),
    },
    setAttribute: vi.fn(),
    removeAttribute: vi.fn(),
    addEventListener: vi.fn(),
    querySelectorAll: vi.fn(() => []),
    focus: vi.fn(),
  };
}

function createLocalStorageMock() {
  const store = new Map();

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

describe("result parser", () => {
  let api;

  beforeAll(async () => {
    const elements = new Map();
    const localStorageMock = createLocalStorageMock();

    const documentMock = {
      getElementById(id) {
        if (!elements.has(id)) {
          elements.set(id, createMockElement());
        }
        return elements.get(id);
      },
    };

    const windowMock = {
      addEventListener: vi.fn(),
      confirm: vi.fn(() => true),
      apiClient: {
        getHistory: vi.fn(async () => ({ entries: [] })),
        syncHistory: vi.fn(async () => ({ entries: [] })),
        generateWorkout: vi.fn(async () => ({
          workoutPlan: "",
          analysis: {
            imc: 22.8,
            classificacaoImc: "peso adequado",
            intensidadeSugerida: "moderada",
            progressaoSemanal: "Aumentar carga com técnica.",
            contextoClinico: "Sem restrições relevantes.",
            mensagemAjuste: null,
            objetivoFinal: "hipertrofia",
            diasTreinoAjustados: 4,
            motivoAjusteDiasTreino: null,
            nivelRisco: "baixo",
            comentariosEssenciais: [],
          },
        })),
      },
      localStorage: localStorageMock,
    };

    vi.stubGlobal("document", documentMock);
    vi.stubGlobal("window", windowMock);
    vi.stubGlobal("navigator", { onLine: true });
    vi.stubGlobal("localStorage", localStorageMock);

    await import("../result.js");
    api = window.__resultPageTestApi;
  });

  beforeEach(() => {
    expect(api).toBeTruthy();
  });

  it("parses exercise rows with dash format", () => {
    const rows = api.extractWorkoutRows(`
Treino A
Agachamento guiado - 3x10 a 12 - carga moderada (quadriceps)
    `);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      bloco: "Treino A",
      exercicio: "Agachamento guiado",
      seriesReps: "3x10 a 12",
      carga: "moderada",
      grupoMuscular: "quadriceps",
    });
  });

  it("preserves advanced-technique notes in exercise names", () => {
    const rows = api.extractWorkoutRows(`
Treino A
Cadeira extensora (drop-set na ultima serie) - 3x10 a 12 - carga moderada (quadriceps)
    `);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      bloco: "Treino A",
      exercicio: "Cadeira extensora (drop-set na ultima serie)",
      seriesReps: "3x10 a 12",
      carga: "moderada",
      grupoMuscular: "quadriceps",
    });
  });

  it("parses exercise rows with pipe format", () => {
    const rows = api.extractWorkoutRows(`
Treino B
Puxada na frente | 3x12 | carga leve | costas
    `);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      bloco: "Treino B",
      exercicio: "Puxada na frente",
      seriesReps: "3x12",
      carga: "leve",
      grupoMuscular: "costas",
    });
  });

  it("extracts workout sections with notes per block", () => {
    const sections = api.extractWorkoutSections(`
Treino A - Gluteo
Elevacao pelvica - 4x10 - carga alta (gluteo)
Observação: priorize amplitude confortável e contração máxima.
Treino B - Costas
Remada baixa - 3x12 - carga moderada (costas)
Descanso: 60 segundos entre séries.
    `);

    expect(sections).toHaveLength(2);
    expect(sections[0].bloco).toBe("Treino A - Gluteo");
    expect(sections[0].notes[0]).toContain("priorize amplitude confortável");
    expect(sections[1].notes[0]).toContain("60 segundos");
  });

  it("renders notes and load badges inside workout content", () => {
    const html = api.renderWorkoutContent(`
Treino A - Quadriceps
Leg press - 4x10 - carga moderada (quadriceps)
Observação: controle a descida e evite compensações.
    `);

    expect(html).toContain("workout-note-item");
    expect(html).toContain("workout-load-moderada");
    expect(html).toContain("Treino A - Quadriceps");
  });

  it("renders advanced-technique badges for structured workout plans", () => {
    const html = api.renderWorkoutContent({
      analise: "Perfil avançado com boa recuperação.",
      ajusteObjetivo: "Objetivo mantido em hipertrofia.",
      estrategia: "Uso pontual de intensificação em exercício estável.",
      ciclo: "Ciclo semanal.",
      treinos: [
        {
          dia: "A",
          nome: "Glúteos prioritários",
          exercicios: [
            {
              nome: "Elevação pélvica",
              series: 4,
              repeticoes: "8 a 10",
              carga: "alta",
              grupoMuscular: "gluteos",
              tecnicaAvancada: "drop-set",
            },
            {
              nome: "Abdução de quadril",
              series: 3,
              repeticoes: "12 a 15",
              carga: "moderada",
              grupoMuscular: "gluteos",
            },
            {
              nome: "Passada com halteres",
              series: 3,
              repeticoes: "10 a 12",
              carga: "moderada",
              grupoMuscular: "gluteos",
            },
          ],
        },
      ],
      distribuicaoSemanal: ["Segunda: Treino A", "Quinta: Treino A"],
      substituicoes: ["Trocar por máquina guiada se necessário."],
      cards: {
        comentarios: ["Execução firme.", "Recuperação adequada."],
        dicas: ["Aqueça antes das séries principais.", "Respeite o intervalo."],
      },
      observacoesFinais: "Manter progressão com técnica estável.",
    });

    expect(html).toContain("workout-technique-badge");
    expect(html).toContain("Técnica avançada:");
    expect(html).toContain("Drop-set");
    expect(html).toContain("Elevação pélvica");
  });
});
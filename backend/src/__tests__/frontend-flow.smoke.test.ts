import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGenerateWorkout } = vi.hoisted(() => ({
  mockGenerateWorkout: vi.fn(),
}));

vi.mock("../agents.js", () => ({
  generateWorkout: mockGenerateWorkout,
}));

import { createApp } from "../app.js";

const app = createApp();

describe("Frontend flow smoke", () => {
  beforeEach(() => {
    mockGenerateWorkout.mockReset();
    mockGenerateWorkout.mockResolvedValue({
      workoutPlan: "Treino A: Agachamento 4x10",
      analysis: {
        imc: 22.8,
        classificacaoImc: "peso adequado",
        intensidadeSugerida: "moderada",
        progressaoSemanal: "Aumentar 3% por semana",
      },
    });
  });

  it("serves form and result pages", async () => {
    const formPage = await request(app).get("/form");
    const resultPage = await request(app).get("/resultado");

    expect(formPage.status).toBe(200);
    expect(formPage.text.toLowerCase()).toContain("form");

    expect(resultPage.status).toBe(200);
    expect(resultPage.text).toContain('id="workout-content"');
  });

  it("enforces login for dashboard page and allows access after authentication", async () => {
    const unauthDashboard = await request(app).get("/dashboard");
    expect(unauthDashboard.status).toBe(302);
    expect(unauthDashboard.headers.location).toBe("/entrar");

    const email = `smoke-${Date.now()}@example.com`;
    const password = "12345678";

    const register = await request(app)
      .post("/api/auth/register")
      .send({ email, password });

    expect(register.status).toBe(200);

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email, password });

    expect(login.status).toBe(200);
    const sessionCookies = login.headers["set-cookie"];
    expect(Array.isArray(sessionCookies)).toBe(true);

    const authDashboard = await request(app)
      .get("/dashboard")
      .set("Cookie", sessionCookies);

    expect(authDashboard.status).toBe(200);
    expect(authDashboard.text.toLowerCase()).toContain("dashboard");

    const dashboardApi = await request(app)
      .get("/api/dashboard")
      .set("Cookie", sessionCookies);

    expect(dashboardApi.status).toBe(200);
    expect(Array.isArray(dashboardApi.body.history)).toBe(true);
  });

  it("executes workout generation and history retrieval flow", async () => {
    const historyBootstrap = await request(app).get("/api/history");
    expect(historyBootstrap.status).toBe(200);
    const clientCookies = historyBootstrap.headers["set-cookie"];
    expect(Array.isArray(clientCookies)).toBe(true);

    const generateResponse = await request(app)
      .post("/api/generate-workout")
      .set("Cookie", clientCookies)
      .send({
        idade: 28,
        peso: 62,
        altura: 1.65,
        objetivo: "hipertrofia",
        nivel: "intermediario",
        diasSemana: 4,
        observacoes: "Sem restricoes",
      });

    expect(generateResponse.status).toBe(200);
    expect(generateResponse.body.workoutPlan).toContain("Treino A");

    const updatedHistory = await request(app)
      .get("/api/history")
      .set("Cookie", clientCookies);

    expect(updatedHistory.status).toBe(200);
    expect(updatedHistory.body.entries.length).toBeGreaterThanOrEqual(1);
  });
});

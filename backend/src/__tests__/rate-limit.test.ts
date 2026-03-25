import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGenerateWorkout } = vi.hoisted(() => ({
  mockGenerateWorkout: vi.fn(),
}));

vi.mock("../agents.js", () => ({
  generateWorkout: mockGenerateWorkout,
}));

import { createApp } from "../app.js";

const validProfile = {
  idade: 28,
  peso: 62,
  altura: 1.65,
  objetivo: "hipertrofia",
  nivel: "intermediario",
  diasSemana: 4,
  observacoes: "Sem restricoes importantes",
};

describe("Route specific rate limits", () => {
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

  it("limits repeated register attempts", async () => {
    const app = createApp();

    for (let index = 0; index < 5; index += 1) {
      const response = await request(app)
        .post("/api/auth/register")
        .send({ email: `limit-register-${index}-${Date.now()}@example.com`, password: "12345678" });

      expect(response.status).toBe(200);
    }

    const limitedResponse = await request(app)
      .post("/api/auth/register")
      .send({ email: `limit-register-final-${Date.now()}@example.com`, password: "12345678" });

    expect(limitedResponse.status).toBe(429);
    expect(limitedResponse.body.error).toBe("Muitas tentativas de cadastro. Aguarde alguns minutos e tente novamente.");
  });

  it("limits repeated login attempts", async () => {
    const app = createApp();

    for (let index = 0; index < 10; index += 1) {
      const response = await request(app)
        .post("/api/auth/login")
        .send({ email: `missing-${index}@example.com`, password: "12345678" });

      expect(response.status).toBe(401);
    }

    const limitedResponse = await request(app)
      .post("/api/auth/login")
      .send({ email: "blocked@example.com", password: "12345678" });

    expect(limitedResponse.status).toBe(429);
    expect(limitedResponse.body.error).toBe("Muitas tentativas de login. Aguarde alguns minutos e tente novamente.");
  });

  it("limits repeated workout generation attempts", async () => {
    const app = createApp();

    for (let index = 0; index < 20; index += 1) {
      const bootstrap = await request(app).get("/api/history");
      const cookies = bootstrap.headers["set-cookie"];

      const response = await request(app)
        .post("/api/generate-workout")
        .set("Cookie", cookies)
        .send(validProfile);

      expect(response.status).toBe(200);
    }

    const limitedBootstrap = await request(app).get("/api/history");
    const limitedCookies = limitedBootstrap.headers["set-cookie"];
    const limitedResponse = await request(app)
      .post("/api/generate-workout")
      .set("Cookie", limitedCookies)
      .send(validProfile);

    expect(limitedResponse.status).toBe(429);
    expect(limitedResponse.body.error).toBe("Muitas solicitações de ficha em sequência. Aguarde um instante e tente novamente.");
  });
});

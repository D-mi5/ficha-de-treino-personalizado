import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGenerateWorkout } = vi.hoisted(() => ({
  mockGenerateWorkout: vi.fn(),
}));

vi.mock("../agents.js", () => ({
  generateWorkout: mockGenerateWorkout,
  getGenerationReadiness: () => ({
    configured: false,
    providerPreference: "auto",
    availableProviders: ["openai"],
    hasOpenAiKey: false,
    hasGeminiKey: false,
  }),
}));

import { createApp } from "../app.js";

const app = createApp();

const validProfile = {
  idade: 28,
  peso: 62,
  altura: 1.65,
  objetivo: "hipertrofia",
  nivel: "intermediario",
  diasSemana: 4,
  observacoes: "Sem restricoes importantes",
};

const validResult = {
  workoutPlan: "Treino A: Agachamento 4x10\nTreino B: Remada 4x12",
  analysis: {
    imc: 22.8,
    classificacaoImc: "peso adequado",
    intensidadeSugerida: "moderada",
    progressaoSemanal: "Aumentar 3% por semana",
  },
};

const validResultWithMeta = {
  ...validResult,
  generationMeta: {
    source: "ai",
    provider: "openai",
    model: "gpt-4o-mini",
    attempts: 1,
  },
};

describe("Workout and auth routes", () => {
  beforeEach(() => {
    mockGenerateWorkout.mockReset();
    mockGenerateWorkout.mockResolvedValue(validResult);
  });

  it("returns security headers and hides x-powered-by", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.headers["x-powered-by"]).toBeUndefined();
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.body.ai).toBeTruthy();
    expect(typeof response.body.ai.configured).toBe("boolean");
    expect(typeof response.body.ai.providerPreference).toBe("string");
    expect(Array.isArray(response.body.ai.availableProviders)).toBe(true);
  });

  it("adds a request id header to responses", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.headers["x-request-id"]).toMatch(/^[a-zA-Z0-9._-]{8,120}$/);
  });

  it("allows configured/local development CORS origin", async () => {
    const response = await request(app)
      .get("/api/health")
      .set("Origin", "http://localhost:5173");

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
  });

  it("does not allow unknown CORS origin", async () => {
    const response = await request(app)
      .get("/api/health")
      .set("Origin", "https://evil.example.com");

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("generates workout and persists it in client history", async () => {
    const historyResponse = await request(app).get("/api/history");
    const cookies = historyResponse.headers["set-cookie"];

    const response = await request(app)
      .post("/api/generate-workout")
      .set("Cookie", cookies)
      .send(validProfile);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(validResult);
    expect(mockGenerateWorkout).toHaveBeenCalledTimes(1);

    const updatedHistory = await request(app)
      .get("/api/history")
      .set("Cookie", cookies);

    expect(updatedHistory.status).toBe(200);
    expect(updatedHistory.body.entries).toHaveLength(1);
    expect(updatedHistory.body.entries[0].payload.objetivo).toBe("hipertrofia");
  });

  it("returns generation source header when metadata is available", async () => {
    mockGenerateWorkout.mockResolvedValueOnce(validResultWithMeta);

    const response = await request(app)
      .post("/api/generate-workout")
      .send(validProfile);

    expect(response.status).toBe(200);
    expect(response.headers["x-generation-source"]).toBe("ai");
  });

  it("rejects invalid workout payload with validation issues", async () => {
    const response = await request(app)
      .post("/api/generate-workout")
      .send({ ...validProfile, idade: 10 });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Dados inválidos");
    expect(response.body.issues.fieldErrors.idade).toBeTruthy();
    expect(mockGenerateWorkout).not.toHaveBeenCalled();
  });

  it("returns safe error when workout generation fails", async () => {
    mockGenerateWorkout.mockRejectedValueOnce(new Error("Falha na IA"));

    const response = await request(app)
      .post("/api/generate-workout")
      .send(validProfile);

    expect(response.status).toBe(500);
    expect(response.body.error).toContain("Não foi possível gerar a ficha de treino no momento.");
  });

  it("redirects /dashboard page when user is not authenticated", async () => {
    const response = await request(app).get("/dashboard");

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/entrar");
  });

  it("registers user with hardened cookie attributes", async () => {
    const email = `routes-${Date.now()}@example.com`;
    const response = await request(app)
      .post("/api/auth/register")
      .send({ email, password: "12345678" });

    expect(response.status).toBe(200);
    const cookies = response.headers["set-cookie"].join(";");
    expect(cookies).toContain("sessionToken=");
    expect(cookies).toContain("HttpOnly");
    expect(cookies).toContain("SameSite=Strict");
  });

  it("rejects login with invalid credentials", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: "12345678" });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("E-mail ou senha incorretos");
  });

  it("clears session cookie on logout", async () => {
    const email = `logout-${Date.now()}@example.com`;
    await request(app)
      .post("/api/auth/register")
      .send({ email, password: "12345678" });

    const loginResponse = await request(app)
      .post("/api/auth/login")
      .send({ email, password: "12345678" });

    const cookies = loginResponse.headers["set-cookie"];
    const logoutResponse = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", cookies);

    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.body.ok).toBe(true);
    expect(logoutResponse.headers["set-cookie"].join(";")).toContain("sessionToken=");
  });

  it("rejects invalid history sync payload", async () => {
    const historyResponse = await request(app).get("/api/history");
    const cookies = historyResponse.headers["set-cookie"];

    const response = await request(app)
      .post("/api/history/sync")
      .set("Cookie", cookies)
      .send({ entries: [{ invalid: true }] });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Dados inválidos");
  });

  it("writes audit log for sensitive auth routes with masked email", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const email = `audit-${Date.now()}@example.com`;

    await request(app)
      .post("/api/auth/register")
      .send({ email, password: "12345678" });

    const auditCall = logSpy.mock.calls.find(([line]) => {
      return (
        typeof line === "string" &&
        line.includes('"msg":"audit_event"') &&
        line.includes('"path":"/api/auth/register"')
      );
    });

    expect(auditCall).toBeTruthy();
    expect(String(auditCall?.[0])).toContain('"email":"au***@example.com"');
    expect(String(auditCall?.[0])).toContain('"requestId"');

    logSpy.mockRestore();
  });
});
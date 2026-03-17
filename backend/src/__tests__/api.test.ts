import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";

const app = createApp();

describe("API integration", () => {
  beforeEach(() => {
    // Keep unique credentials per test to avoid cross-test collisions in in-memory store.
  });

  it("returns health status", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, service: "workout-generator" });
  });

  it("registers, logs in, and fetches authenticated dashboard history", async () => {
    const email = `test-${Date.now()}@example.com`;
    const password = "12345678";

    const registerResponse = await request(app)
      .post("/api/auth/register")
      .send({ email, password });

    expect(registerResponse.status).toBe(200);
    expect(registerResponse.body.email).toBe(email);
    expect(registerResponse.body.userId).toBeTruthy();

    const loginResponse = await request(app)
      .post("/api/auth/login")
      .send({ email, password });

    expect(loginResponse.status).toBe(200);
    const cookies = loginResponse.headers["set-cookie"];
    expect(Array.isArray(cookies)).toBe(true);

    const dashboardResponse = await request(app)
      .get("/api/dashboard")
      .set("Cookie", cookies);

    expect(dashboardResponse.status).toBe(200);
    expect(Array.isArray(dashboardResponse.body.history)).toBe(true);
  });

  it("returns dashboard unauthorized when no session exists", async () => {
    const response = await request(app).get("/api/dashboard");

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Não autenticado");
  });

  it("syncs history entries for an anonymous client", async () => {
    const firstResponse = await request(app).get("/api/history");
    expect(firstResponse.status).toBe(200);

    const clientCookies = firstResponse.headers["set-cookie"];
    expect(Array.isArray(clientCookies)).toBe(true);

    const syncPayload = {
      entries: [
        {
          id: `entry-${Date.now()}`,
          createdAt: new Date().toISOString(),
          payload: {
            idade: 28,
            peso: 62,
            altura: 1.65,
            objetivo: "hipertrofia",
            nivel: "intermediario",
            diasSemana: 4,
          },
          result: {
            workoutPlan: "Treino A: Agachamento 4x10",
            analysis: {
              imc: 22.8,
              classificacaoImc: "peso adequado",
              intensidadeSugerida: "moderada",
              progressaoSemanal: "Aumentar 3% por semana",
            },
          },
        },
      ],
    };

    const syncResponse = await request(app)
      .post("/api/history/sync")
      .set("Cookie", clientCookies)
      .send(syncPayload);

    expect(syncResponse.status).toBe(200);
    expect(Array.isArray(syncResponse.body.entries)).toBe(true);
    expect(syncResponse.body.entries.length).toBeGreaterThan(0);
  });
});

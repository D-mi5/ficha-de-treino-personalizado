import { expect, test } from "@playwright/test";

const mockedWorkoutResponse = {
  workoutPlan: "Treino A: Agachamento 4x10\nTreino B: Remada 4x12\n1) Hidratação\n2) Descanso",
  analysis: {
    imc: 22.8,
    classificacaoImc: "peso adequado",
    intensidadeSugerida: "moderada",
    progressaoSemanal: "Aumentar 3% por semana",
  },
};

const dashboardSeedHistory = [
  {
    id: "history-1",
    createdAt: "2026-03-01T10:00:00.000Z",
    payload: {
      nome: "Cliente A",
      idade: 28,
      peso: 62,
      altura: 1.65,
      objetivo: "hipertrofia",
      nivel: "intermediario",
      diasSemana: 4,
      observacoes: "Sem restricoes",
    },
    result: mockedWorkoutResponse,
  },
  {
    id: "history-2",
    createdAt: "2026-03-15T10:00:00.000Z",
    payload: {
      nome: "Cliente B",
      idade: 31,
      peso: 58,
      altura: 1.64,
      objetivo: "definicao",
      nivel: "intermediario",
      diasSemana: 5,
      observacoes: "Sem restricoes",
    },
    result: {
      workoutPlan: "Treino C: Afundo 4x12",
      analysis: {
        imc: 21.6,
        classificacaoImc: "peso adequado",
        intensidadeSugerida: "moderada",
        progressaoSemanal: "Aumentar 2% por semana",
      },
    },
  },
];

async function registerViaApi(page: import("@playwright/test").Page, email: string): Promise<void> {
  const response = await page.request.post("/api/auth/register", {
    data: { email, password: "12345678" },
  });

  expect(response.ok()).toBeTruthy();
}

test.describe("Fluxo principal da aplicacao", () => {
  test("preenche formulario e exibe ficha na tela de resultado", async ({ page }) => {
    await page.route("**/api/generate-workout", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockedWorkoutResponse),
      });
    });

    await page.goto("/form");

    await page.locator('input[name="idade"]').fill("28");
    await page.locator('input[name="peso"]').fill("62");
    await page.locator('input[name="altura"]').fill("1.65");
    await page.locator('select[name="objetivo"]').selectOption("hipertrofia");
    await page.locator('select[name="nivel"]').selectOption("intermediario");
    await page.locator('select[name="diasSemana"]').selectOption("4");
    await page.locator('textarea[name="observacoes"]').fill("Sem restricoes importantes");

    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/resultado$/);
    await expect(page.locator("#result")).toBeVisible();
    await expect(page.locator("#imc-value")).toContainText("22.8");
    await expect(page.locator("#intensity-value")).toContainText("moderada");
    await expect(page.locator("#workout-content")).toContainText("Agachamento");
  });

  test("exibe mensagem de erro controlada quando a geracao falha", async ({ page }) => {
    await page.route("**/api/generate-workout", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Falha interna simulada" }),
      });
    });

    await page.goto("/form");
    await page.locator('input[name="idade"]').fill("28");
    await page.locator('input[name="peso"]').fill("62");
    await page.locator('input[name="altura"]').fill("1.65");
    await page.locator('select[name="objetivo"]').selectOption("hipertrofia");
    await page.locator('select[name="nivel"]').selectOption("intermediario");
    await page.locator('select[name="diasSemana"]').selectOption("4");
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/resultado$/);
    await expect(page.locator("#error")).toBeVisible();
    await expect(page.locator("#error-message")).toContainText("Não foi possível gerar seu plano agora");
  });

  test("cria conta, acessa dashboard e faz logout", async ({ page }) => {
    const uniqueEmail = `playwright-${Date.now()}@example.com`;

    await page.goto("/entrar");
    await page.locator("#tab-signup").click();
    await page.locator("#signup-email").fill(uniqueEmail);
    await page.locator("#signup-password").fill("12345678");
    await page.locator("#signup-password-confirm").fill("12345678");
    await page.locator("#signup-submit").click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.locator("h1")).toContainText("Sua evolução de fichas");
    await expect(page.locator("#content")).toBeVisible();
    await expect(page.locator("#stats")).toBeVisible();

    await page.locator("#logout-btn").click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator("h1")).toContainText("Transforme seu treino");
  });

  test("aplica filtro por objetivo no dashboard com historico controlado", async ({ page }) => {
    const uniqueEmail = `filters-${Date.now()}@example.com`;
    await registerViaApi(page, uniqueEmail);

    await page.route("**/api/dashboard", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ history: dashboardSeedHistory }),
      });
    });

    await page.goto("/dashboard");

    await expect(page.locator("#content")).toBeVisible();
    await expect(page.locator("#history-grid article")).toHaveCount(2);

    await page.locator("#filter-goal").selectOption("definicao");
    await page.locator("#apply-filters").click();

    await expect(page.locator("#history-grid article")).toHaveCount(1);
    await expect(page.locator("#history-grid")).toContainText("Definição");

    await page.locator("#filter-goal").selectOption("hipertrofia");
    await page.locator("#apply-filters").click();

    await expect(page.locator("#history-grid article")).toHaveCount(1);
    await expect(page.locator("#history-grid")).toContainText("Hipertrofia");
    await expect(page.locator("#history-grid")).not.toContainText("Definição");
  });
});

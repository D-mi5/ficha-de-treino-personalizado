import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const OUTPUT_DIR = path.resolve("artifacts/preview");

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    recordVideo: { dir: OUTPUT_DIR, size: { width: 1366, height: 768 } },
  });
  const page = await context.newPage();

  await page.goto("http://127.0.0.1:3000/form", { waitUntil: "domcontentloaded", timeout: 30000 });

  await page.fill('input[name="nome"]', "Cliente Demo Completa");
  await page.fill('input[name="idade"]', "31");
  await page.fill('input[name="peso"]', "63");
  await page.fill('input[name="altura"]', "1.66");
  await page.selectOption('select[name="objetivo"]', "hipertrofia");
  await page.selectOption('select[name="nivel"]', "avancado");
  await page.selectOption('select[name="diasSemana"]', "4");
  await page.selectOption('select[name="periodicidade"]', "semanal");
  await page.waitForTimeout(300);
  await page.selectOption('select[name="focoTreino"]', "gluteo");
  await page.fill('textarea[name="observacoes"]', "Sem restricoes clinicas relevantes. Boa recuperacao e experiencia de treino.");

  await page.waitForTimeout(700);
  await page.click("#submit-workout");

  await page.waitForURL("**/resultado", { timeout: 60000 });
  await page.waitForSelector("#result:not(.hidden)", { timeout: 90000 });
  await page.waitForTimeout(3500);

  await page.mouse.wheel(0, 700);
  await page.waitForTimeout(1200);
  await page.mouse.wheel(0, 700);
  await page.waitForTimeout(1200);

  const video = page.video();
  await context.close();
  await browser.close();

  const videoPath = await video.path();
  const outPath = path.resolve("artifacts/preview/preview-flow.webm");
  fs.copyFileSync(videoPath, outPath);
  console.log(outPath);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

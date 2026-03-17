import PDFDocument from "pdfkit";
import { ClientProfile, WorkoutResponse } from "./types.js";

function addSectionTitle(doc: PDFKit.PDFDocument, title: string): void {
  doc.moveDown(0.7);
  doc.font("Helvetica-Bold").fontSize(13).fillColor("#08163A").text(title);
  doc.moveDown(0.3);
}

export async function buildWorkoutPdf(
  profile: ClientProfile,
  result: WorkoutResponse,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.font("Helvetica-Bold").fontSize(20).fillColor("#08163A").text("Ficha de Treino Feminino");
    doc.font("Helvetica").fontSize(11).fillColor("#333333").text("Plano personalizado com base cientifica");

    addSectionTitle(doc, "Dados da Cliente");
    doc
      .font("Helvetica")
      .fontSize(11)
      .fillColor("#111111")
      .text(`Idade: ${profile.idade}`)
      .text(`Peso: ${profile.peso} kg`)
      .text(`Altura: ${profile.altura} m`)
      .text(`Objetivo: ${profile.objetivo}`)
      .text(`Nivel: ${profile.nivel}`)
      .text(`Dias por semana: ${profile.diasSemana}`);

    addSectionTitle(doc, "Analise Inicial");
    doc
      .font("Helvetica")
      .fontSize(11)
      .text(`IMC: ${result.analysis.imc} (${result.analysis.classificacaoImc})`)
      .text(`Intensidade sugerida: ${result.analysis.intensidadeSugerida}`)
      .text(`Progressao semanal: ${result.analysis.progressaoSemanal}`);

    addSectionTitle(doc, "Ficha Completa");
    doc.font("Helvetica").fontSize(10).fillColor("#1A1A1A").text(result.workoutPlan, {
      lineGap: 4,
      align: "left",
    });

    doc.end();
  });
}

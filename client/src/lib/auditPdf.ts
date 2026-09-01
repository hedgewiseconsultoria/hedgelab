import { jsPDF } from "jspdf";
import { createAuditReportModel, type AuditExposure, type AuditLineage } from "./auditReportModel";

function money(value: number, currency: string) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
}

function quantity(value: number) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(value);
}

function appendWrapped(pdf: jsPDF, text: string, x: number, y: number, width: number, lineHeight = 5): number {
  const lines = pdf.splitTextToSize(text, width) as string[];
  pdf.text(lines, x, y);
  return y + lines.length * lineHeight;
}

function ensureSpace(pdf: jsPDF, y: number, required: number): number {
  if (y + required < 282) return y;
  pdf.addPage();
  return 20;
}

export function downloadAuditPdf(input: {
  scenarioId: string;
  exposures: AuditExposure[];
  lineage: AuditLineage[];
  calculationMemory?: string[];
  limitations?: string[];
}) {
  const model = createAuditReportModel({
    generatedAtUtc: new Date().toISOString(),
    scenarioId: input.scenarioId,
    exposures: input.exposures,
    lineage: input.lineage,
    calculationMemory: input.calculationMemory,
    limitations: input.limitations,
  });
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  let y = 18;

  pdf.setFillColor(21, 53, 61);
  pdf.rect(0, 0, 210, 36, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text("HEDGE LAB", 16, 16);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text("RELATÓRIO DE RASTREABILIDADE DE CENÁRIO", 16, 23);
  pdf.text(`Gerado em UTC: ${model.generatedAtUtc}`, 16, 29);
  pdf.setTextColor(34, 58, 62);
  y = 48;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("1. Identificação do cenário", 16, y);
  y += 7;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text(`Identificador: ${model.scenarioId}`, 16, y);
  y += 9;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("2. Exposições no DataFrame da sessão", 16, y);
  y += 7;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  if (model.exposures.length === 0) {
    y = appendWrapped(pdf, "Nenhuma exposição foi incluída no DataFrame no momento da geração.", 16, y, 178);
  } else {
    for (const exposure of model.exposures) {
      y = ensureSpace(pdf, y, 14);
      const amountLabel = exposure.exposureClass === "PHYSICAL_COMMODITY"
        ? `${quantity(exposure.physicalQuantity ?? 0)} ${exposure.physicalUnit ?? ""} (${exposure.commodityReference ?? "commodity"}) — quantidade física, sem valor monetário implícito`
        : money(exposure.notional, exposure.currency);
      y = appendWrapped(pdf, `${exposure.description} | ${exposure.direction === "PAYABLE" ? "Pagável" : "Recebível"} | ${amountLabel} | Fluxo: ${exposure.cashflow_date}`, 16, y, 178);
      y += 2;
    }
  }
  y += 7;

  y = ensureSpace(pdf, y, 26);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("3. Memória de cálculo e estado quantitativo", 16, y);
  y += 7;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  for (const item of model.calculationMemory) {
    y = ensureSpace(pdf, y, 12);
    y = appendWrapped(pdf, `• ${item}`, 16, y, 178);
    y += 1.5;
  }
  y += 5;

  y = ensureSpace(pdf, y, 26);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("4. Fontes e linhagem", 16, y);
  y += 7;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  if (model.lineage.length === 0) {
    y = appendWrapped(pdf, "Nenhuma fonte foi carregada na sessão. O relatório não contém dados de mercado.", 16, y, 178);
  } else {
    for (const source of model.lineage) {
      y = ensureSpace(pdf, y, 24);
      pdf.setFont("helvetica", "bold");
      pdf.text(source.source_id, 16, y);
      pdf.setFont("helvetica", "normal");
      y += 4;
      y = appendWrapped(pdf, `URL: ${source.source_url}`, 16, y, 178, 4);
      y = appendWrapped(pdf, `Arquivo/recurso: ${source.source_file} | Data-base: ${source.source_asof ?? "não aplicável"} | Extração UTC: ${source.extracted_at_utc}`, 16, y + 1, 178, 4);
      y = appendWrapped(pdf, `Parser: ${source.parser_version} | Validação: ${source.validation_status} | SHA-256: ${source.source_hash_sha256 ?? "não disponível"}`, 16, y + 1, 178, 4);
      if (source.source_id === "FGV_IGPM") {
        y = appendWrapped(pdf, "Exceção de fonte: FGV autorizada exclusivamente para IGP-M. Esta exceção não se estende a outros índices ou fontes do relatório.", 16, y + 1, 178, 4);
      }
      y += 3;
    }
  }

  y = ensureSpace(pdf, y, 26);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("5. Limitações e ressalvas", 16, y);
  y += 7;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  for (const item of model.limitations) {
    y = ensureSpace(pdf, y, 12);
    y = appendWrapped(pdf, `• ${item}`, 16, y, 178);
    y += 1.5;
  }
  pdf.save(`hedge-lab-relatorio-${model.scenarioId}.pdf`);
}

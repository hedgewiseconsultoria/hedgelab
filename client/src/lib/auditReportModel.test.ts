import { describe, expect, it } from "vitest";
import { createAuditReportModel } from "./auditReportModel";

describe("modelo de relatório auditável", () => {
  it("preserva o carimbo, as fontes e as limitações quando não existem cálculos de preço validados", () => {
    const model = createAuditReportModel({
      generatedAtUtc: "2026-08-17T21:00:00.000Z",
      scenarioId: "sessao-001",
      exposures: [{ description: "Importação", currency: "USD", direction: "PAYABLE", notional: 50000, cashflow_date: "2026-09-01" }],
      lineage: [{ source_id: "BCB_PTAX", source_url: "https://olinda.bcb.gov.br/", source_file: "CotacaoDolarDia", extracted_at_utc: "2026-08-17T20:00:00.000Z", source_asof: "2026-08-14", source_hash_sha256: "abc", parser_version: "v1", validation_status: "valid" }],
    });

    expect(model.generatedAtUtc).toBe("2026-08-17T21:00:00.000Z");
    expect(model.lineage[0]?.source_id).toBe("BCB_PTAX");
    expect(model.calculationMemory.join(" ")).toContain("Nenhum MTM");
    expect(model.limitations).toHaveLength(3);
  });

  it("preserva memórias e limitações estruturadas de módulos executados", () => {
    const model = createAuditReportModel({
      generatedAtUtc: "2026-08-17T21:00:00.000Z", scenarioId: "sessao-002", exposures: [], lineage: [],
      calculationMemory: ["Exposição residual = exposição bruta + hedge equivalente."],
      limitations: ["MTM permanece bloqueado sem curva estrangeira oficial."],
    });
    expect(model.calculationMemory).toEqual(["Exposição residual = exposição bruta + hedge equivalente."]);
    expect(model.limitations).toEqual(["MTM permanece bloqueado sem curva estrangeira oficial."]);
  });
});

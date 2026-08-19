import { describe, expect, it } from "vitest";
import { diagnoseHedgeAlternatives } from "./hedgeAlternatives";

describe("diagnoseHedgeAlternatives", () => {
  it("diagnostica pagamento em dólar antes de apresentar alternativas listadas e bilaterais", () => {
    const result = diagnoseHedgeAlternatives({ exposureId: "EXP-USD-001", kind: "USD_PAYABLE", description: "Importação", notional: 2_000_000, currency: "USD", maturityDate: "2026-12-15" });
    expect(result.diagnosis).toMatchObject({ riskFactor: "USD_BRL", adverseMove: "alta de USD/BRL", hedgeDirection: "BUY" });
    expect(result.alternatives.map(item => item.kind)).toEqual(["B3_DOL_FUTURE", "B3_WDO_FUTURE", "B3_DOL_OPTION", "OTC_NDF_OR_TERM", "OTC_FX_SWAP"]);
    expect(result.alternatives.find(item => item.kind === "OTC_NDF_OR_TERM")).toMatchObject({ status: "contract_required" });
  });

  it("mapeia dívida CDI para DI1, FRA, opção de DI e swap sem calcular curva ausente", () => {
    const result = diagnoseHedgeAlternatives({ exposureId: "EXP-DI-001", kind: "CDI_LINKED_DEBT", description: "Dívida CDI + spread", notional: 30_000_000, currency: "BRL", maturityDate: "2029-08-01", indexer: "CDI", interestSpreadPctAa: 1.5 });
    expect(result.diagnosis).toMatchObject({ riskFactor: "CDI_RATE", hedgeDirection: "SELL" });
    expect(result.alternatives.find(item => item.kind === "B3_DI1_FUTURE")?.requiredData).toContain("vértice de curva validado");
    expect(result.alternatives.find(item => item.kind === "B3_FRA_DI1")).toMatchObject({ status: "blocked", blockingReason: expect.stringMatching(/razão de contratos/i) });
    expect(result.alternatives.find(item => item.kind === "B3_DI1_OPTION")).toMatchObject({ status: "blocked", blockingReason: expect.stringMatching(/PU, taxa, MTM/i) });
  });

  it("mapeia produtor de milho para futuro e opção da mesma referência sem inferir base física", () => {
    const result = diagnoseHedgeAlternatives({ exposureId: "EXP-CCM-001", kind: "COMMODITY_SALE", description: "Venda de milho", notional: 10_000, currency: "BRL", maturityDate: "2027-02-01", commodityReference: "CCM" });
    expect(result.diagnosis).toMatchObject({ riskFactor: "B3_COMMODITY_PRICE", hedgeDirection: "SELL" });
    expect(result.alternatives.map(item => item.kind)).toEqual(["B3_COMMODITY_FUTURE", "B3_COMMODITY_OPTION"]);
    expect(result.alternatives[0]?.requiredData).toContain("unidade de exposição");
  });

  it("rejeita commodity sem referência B3 declarada", () => {
    expect(() => diagnoseHedgeAlternatives({ exposureId: "EXP-AGRO-001", kind: "COMMODITY_PURCHASE", description: "Compra agrícola", notional: 10, currency: "BRL", maturityDate: "2027-02-01" })).toThrow("referência B3 declarada");
  });
});

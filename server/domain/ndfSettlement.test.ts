import { describe, expect, it } from "vitest";
import { calculateNdfSettlementScenario } from "./ndfSettlement";

const lineage = {
  ptaxLineage: { sourceId: "BCB_PTAX" as const, sourceAsOf: "2026-08-13", sourceHashSha256: "p".repeat(64) },
  ettjLineage: { sourceId: "ANBIMA_ETTJ" as const, sourceAsOf: "2026-08-13", sourceHashSha256: "e".repeat(64) },
};

describe("liquidação NDF em cenário", () => {
  it("calcula o valor descontado em BRL por base 252 e mantém o MTM bloqueado", () => {
    const result = calculateNdfSettlementScenario({
      contractId: "NDF-001", direction: "BUY_USD", notionalUsd: 100_000, contractedRateBrlPerUsd: 5.2, fixingRateBrlPerUsd: 5.35,
      valuationDate: "2026-08-13", remainingBusinessDays: 1, preRatePctAa252: 14, settlementCalendar: "B3_TRADING_2026", ...lineage,
    });
    expect(result.grossSettlementBrl).toBeCloseTo(15_000, 8);
    expect(result.discountFactorPre252).toBeLessThan(1);
    expect(result.presentValueBrl).toBeLessThan(15_000);
    expect(result.mtmStatus).toBe("blocked_missing_foreign_currency_curve");
  });

  it("inverte o sinal econômico para venda de USD", () => {
    const result = calculateNdfSettlementScenario({
      contractId: "NDF-002", direction: "SELL_USD", notionalUsd: 10_000, contractedRateBrlPerUsd: 5.2, fixingRateBrlPerUsd: 5.3,
      valuationDate: "2026-08-13", remainingBusinessDays: 0, preRatePctAa252: 14, settlementCalendar: "B3_TRADING_2026", ...lineage,
    });
    expect(result.grossSettlementBrl).toBeCloseTo(-1_000, 8);
  });

  it("recusa a taxa de fixing sem linhagem de PTAX e ETTJ", () => {
    expect(() => calculateNdfSettlementScenario({
      contractId: "NDF-003", direction: "BUY_USD", notionalUsd: 10_000, contractedRateBrlPerUsd: 5.2, fixingRateBrlPerUsd: 5.3,
      valuationDate: "2026-08-13", remainingBusinessDays: 0, preRatePctAa252: 14, settlementCalendar: "B3_TRADING_2026",
      ptaxLineage: { sourceId: "BCB_PTAX", sourceAsOf: "", sourceHashSha256: null },
      ettjLineage: { sourceId: "ANBIMA_ETTJ", sourceAsOf: "", sourceHashSha256: null },
    })).toThrow("data-base de linhagem");
  });
});

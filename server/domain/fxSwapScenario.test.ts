import { describe, expect, it } from "vitest";
import { calculateBcbTraditionalFxSwapScenario } from "./fxSwapScenario";

const lineage = { bcbSwapLineage: { sourceId: "BCB_FX_SWAP" as const, sourceUrl: "https://www.bcb.gov.br/estabilidadefinanceira/swapcambial", extractedAtUtc: "2026-08-17T20:34:00.000Z" }, fxLineage: { sourceId: "BCB_PTAX" as const, sourceAsOf: "2026-08-13", sourceHashSha256: "a".repeat(64) }, domesticRateLineage: { sourceId: "BCB_SELIC" as const, sourceAsOf: "2026-08-13", sourceHashSha256: "b".repeat(64) } };

describe("cenário de swap cambial tradicional BCB", () => {
  it("compara a perna câmbio mais cupom com a perna Selic", () => {
    const result = calculateBcbTraditionalFxSwapScenario({ contractId: "SWAP-CAMBIAL-001", position: "RECEIVE_FX_COUPON_PAY_SELIC", notionalUsd: 100_000, initialFxBrlPerUsd: 5.2, finalFxBrlPerUsd: 5.3, fxCouponPctAa252: 5, selicPctAa252: 14, businessDays: 21, ...lineage });
    expect(result.contractId).toBe("SWAP-CAMBIAL-001");
    expect(result.notionalReferenceBrl).toBe(520_000);
    expect(result.netCashflowBrl).toBeGreaterThan(0);
    expect(result.pricingStatus).toBe("cashflow_scenario_not_contract_mtm");
  });
});

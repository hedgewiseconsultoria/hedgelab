import { describe, expect, it } from "vitest";
import { calculateB3FxFutureDailySettlement } from "./b3FxFutureSettlement";

const before = { sourceId: "B3_PUBLIC_FILES" as const, sourceAsOf: "2026-08-12", sourceFile: "PR260812.xml", sourceHashSha256: "a".repeat(64) };
const after = { sourceId: "B3_PUBLIC_FILES" as const, sourceAsOf: "2026-08-13", sourceFile: "PR260813.xml", sourceHashSha256: "b".repeat(64) };

describe("variação diária de ajuste DOL/WDO", () => {
  it("converte a variação cotada por USD 1.000 para BRL por contrato DOL", () => {
    const result = calculateB3FxFutureDailySettlement({ contract: "DOL", position: "LONG_USD", contracts: 2, previousSettlementQuoteBrlPerUsd1000: 5_200, currentSettlementQuoteBrlPerUsd1000: 5_210, previousB3Lineage: before, currentB3Lineage: after });
    expect(result.dailySettlementVariationBrl).toBe(1_000);
    expect(result.status).toBe("daily_settlement_variation_not_full_mtm");
  });

  it("inverte o resultado para uma posição vendida WDO", () => {
    const result = calculateB3FxFutureDailySettlement({ contract: "WDO", position: "SHORT_USD", contracts: 1, previousSettlementQuoteBrlPerUsd1000: 5_200, currentSettlementQuoteBrlPerUsd1000: 5_210, previousB3Lineage: before, currentB3Lineage: after });
    expect(result.dailySettlementVariationBrl).toBe(-100);
  });
});

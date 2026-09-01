import { describe, expect, it } from "vitest";
import { calculateB3DollarOptionIntrinsicSettlement } from "./b3DollarOptionSettlement";

const lineage = { sourceId: "B3_PUBLIC_FILES" as const, sourceAsOf: "2026-08-13", sourceFile: "PR260813.xml", sourceHashSha256: "b".repeat(64) };

describe("exercício intrínseco de opção DOL", () => {
  it("calcula somente o exercício intrínseco de uma call comprada com liquidação B3 rastreável", () => {
    const result = calculateB3DollarOptionIntrinsicSettlement({ optionPosition: "LONG", optionType: "CALL", contracts: 2, strikeBrlPerUsd: 5.2, underlyingSettlementBrlPerUsd: 5.3, underlyingSymbol: "DOL", b3Lineage: lineage });
    expect(result.grossExerciseBrl).toBeCloseTo(10_000, 8);
    expect(result.exerciseEligibility).toBe("in_the_money");
    expect(result.blockedMetrics).toContain("greeks");
  });

  it("mantém put fora do dinheiro com exercício nulo", () => {
    const result = calculateB3DollarOptionIntrinsicSettlement({ optionPosition: "LONG", optionType: "PUT", contracts: 1, strikeBrlPerUsd: 5.2, underlyingSettlementBrlPerUsd: 5.3, underlyingSymbol: "DOL", b3Lineage: lineage });
    expect(result.grossExerciseBrl).toBe(0);
  });
});

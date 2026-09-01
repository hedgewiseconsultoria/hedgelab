import { describe, expect, it } from "vitest";
import { calculateB3CornOptionIntrinsicSettlement } from "./b3CornOptionSettlement";

const lineage = { sourceId: "B3_PUBLIC_FILES" as const, sourceAsOf: "2026-08-17", sourceFile: "BVBG.086.01.xml", sourceHashSha256: "a".repeat(64) };
describe("exercício intrínseco de opção CCM", () => {
  it("calcula somente o exercício de call comprada pela unidade oficial de 450 sacas", () => {
    const result = calculateB3CornOptionIntrinsicSettlement({ optionPosition: "LONG", optionType: "CALL", contracts: 2, strikeBrlPerSack: 70, underlyingSettlementBrlPerSack: 72, underlyingSymbol: "CCMU26", b3Lineage: lineage });
    expect(result).toMatchObject({ contractSizeSacks60Kg: 450, exerciseStyle: "AMERICAN", grossExerciseBrl: 1_800, exerciseEligibility: "in_the_money" });
    expect(result.blockedMetrics).toContain("greeks");
  });
});

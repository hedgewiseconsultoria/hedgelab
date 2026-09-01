import { describe, expect, it } from "vitest";
import { calculateB3SoyOptionIntrinsicSettlement } from "./b3SoyOptionSettlement";
describe("exercício intrínseco de opção SOY", () => it("usa 34 toneladas por contrato e resultado em USD", () => {
  const result = calculateB3SoyOptionIntrinsicSettlement({ optionPosition: "LONG", optionType: "CALL", contracts: 2, strikeUsdPerTon: 350, underlyingSettlementUsdPerTon: 355, underlyingSymbol: "SOYX26", b3Lineage: { sourceId: "B3_PUBLIC_FILES", sourceAsOf: "2026-08-17", sourceFile: "BVBG.086.01.xml", sourceHashSha256: "e".repeat(64) } });
  expect(result).toMatchObject({ contractSizeMetricTons: 34, grossExerciseUsd: 340, exerciseStyle: "AMERICAN" });
}));

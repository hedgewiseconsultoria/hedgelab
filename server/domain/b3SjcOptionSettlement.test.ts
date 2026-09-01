import { describe, expect, it } from "vitest";
import { calculateB3SjcOptionIntrinsicSettlement } from "./b3SjcOptionSettlement";
describe("exercício intrínseco de opção SJC", () => it("usa 450 sacas por contrato e resultado em USD", () => {
  const result = calculateB3SjcOptionIntrinsicSettlement({ optionPosition: "LONG", optionType: "CALL", contracts: 1, strikeUsdPerSack: 10, underlyingSettlementUsdPerSack: 11, underlyingSymbol: "SJCX26", b3Lineage: { sourceId: "B3_PUBLIC_FILES", sourceAsOf: "2026-08-17", sourceFile: "BVBG.086.01.xml", sourceHashSha256: "f".repeat(64) } });
  expect(result).toMatchObject({ contractSizeSacks60Kg: 450, grossExerciseUsd: 450, exerciseStyle: "AMERICAN" });
}));

import { describe, expect, it } from "vitest";
import { calculateB3CattleOptionIntrinsicSettlement } from "./b3CattleOptionSettlement";
describe("exercício intrínseco de opção BGI", () => it("usa 330 arrobas por contrato", () => {
  const result = calculateB3CattleOptionIntrinsicSettlement({ optionPosition: "LONG", optionType: "PUT", contracts: 2, strikeBrlPerArroba: 350, underlyingSettlementBrlPerArroba: 345, underlyingSymbol: "BGIV26", b3Lineage: { sourceId: "B3_PUBLIC_FILES", sourceAsOf: "2026-08-17", sourceFile: "BVBG.086.01.xml", sourceHashSha256: "b".repeat(64) } });
  expect(result).toMatchObject({ contractSizeArrobas: 330, grossExerciseBrl: 3_300, exerciseStyle: "AMERICAN" });
}));

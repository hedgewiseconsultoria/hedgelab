import { describe, expect, it } from "vitest";
import { calculateDi1VariationMargin } from "./di1VariationMargin";

const today = { sourceId: "B3_PUBLIC_FILES" as const, sourceAsOf: "2026-08-13", sourceFile: "PR260813.xml", sourceHashSha256: "a".repeat(64) };
const previous = { sourceId: "B3_PUBLIC_FILES" as const, sourceAsOf: "2026-08-12", sourceFile: "PR260812.xml", sourceHashSha256: "b".repeat(64) };
const di = { sourceId: "B3_PUBLIC_FILES" as const, sourceAsOf: "2026-08-13", sourceFile: "DI260813.csv", sourceHashSha256: "c".repeat(64) };

describe("margem de variação DI1", () => {
  it("calcula PO e AD de posição iniciada no dia conforme fórmula B3", () => {
    const result = calculateDi1VariationMargin({ position: "PU_BUYER", contracts: 2, positionState: "INITIATED_TODAY", settlementPuToday: 99_000, tradeRatePct: 14, businessDaysToDayBeforeExpiration: 252, settlementLineage: today });
    expect(result.tradePu).toBeCloseTo(87_719.298, 3);
    expect(result.dailyVariationMarginBrl).toBeCloseTo((99_000 - 87_719.298) * 2, 3);
  });

  it("corrige o PU anterior pela taxa DI antes de calcular AD da posição em aberto", () => {
    const result = calculateDi1VariationMargin({ position: "PU_SELLER", contracts: 1, positionState: "OUTSTANDING_FROM_PREVIOUS_DAY", settlementPuToday: 99_100, settlementPuPreviousDay: 99_000, diRatesPctForCorrection: [14], settlementLineage: today, previousSettlementLineage: previous, diRateLineage: di });
    expect(result.correctionFactor).toBeGreaterThan(1);
    expect(result.dailyVariationMarginBrl).toBeLessThan(0);
  });
});

import { describe, expect, it } from "vitest";
import { calculateFxStress, calculateParametricVar, calculateResidualRisk, inverseStandardNormal } from "./fxRiskScenario";

describe("cenário cambial e VaR paramétrico", () => {
  it("calcula efeito econômico de choque para exposição pagável", () => {
    const result = calculateFxStress({ exposureUsd: 100000, economicDirection: "PAYABLE", ptaxSale: 5, fxShockPct: 0.1 });
    expect(result.stressedRate).toBe(5.5);
    expect(result.pnlBrl).toBe(-50000);
    expect(result.signedDeltaBrlPerOnePercent).toBe(-5000);
  });

  it("usa o quantil normal do nível de confiança informado", () => {
    const result = calculateParametricVar({ exposureBrl: 500000, dailyVolatilityPct: 0.01, holdingPeriodBusinessDays: 1, confidenceLevel: 0.95 });
    expect(result.normalQuantile).toBeCloseTo(1.64485, 4);
    expect(result.varBrl).toBeCloseTo(8224.25, 1);
  });

  it("recusa parâmetro de confiança inválido", () => {
    expect(() => inverseStandardNormal(1)).toThrow("entre 0 e 1");
  });

  it("calcula exposição e VaR residuais após equivalência econômica do hedge", () => {
    const result = calculateResidualRisk({ grossExposureBrl: 1_000_000, hedgeEquivalentExposureBrl: -800_000, dailyVolatilityPct: 0.01, holdingPeriodBusinessDays: 1, confidenceLevel: 0.95, lineage: { valuationAsOf: "2026-08-13", sourceIds: ["BCB_PTAX", "B3_PUBLIC_FILES"] } });
    expect(result.residualExposureBrl).toBe(200_000);
    expect(result.coveragePct).toBeCloseTo(0.8, 8);
    expect(result.residualVarBrl).toBeGreaterThan(0);
  });
});

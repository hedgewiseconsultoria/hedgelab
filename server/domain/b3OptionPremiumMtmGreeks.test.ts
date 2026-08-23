import { describe, expect, it } from "vitest";
import { black76Premium } from "./optionPricing";
import { calculateB3OptionPremiumMtmGreeks, type B3OptionPremiumMtmGreeksInput } from "./b3OptionPremiumMtmGreeks";

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);

function baseInput(overrides: Partial<B3OptionPremiumMtmGreeksInput> = {}): B3OptionPremiumMtmGreeksInput {
  return {
    optionPosition: "LONG", optionType: "CALL", contracts: 10, contractMultiplier: 50_000, unitLabel: "USD",
    strike: 5.20, underlyingSettlement: 5.35,
    observedOptionPremium: 0.18,
    valuationDate: "2026-08-17", expiryDate: "2026-11-16", calendarId: "B3_TRADING_2026",
    riskFreeRateAnnual: 0.12,
    underlyingSymbol: "DOLZ26", optionSeriesSymbol: "DOLZ26C520",
    premiumLineage: { sourceId: "B3_PUBLIC_FILES", sourceAsOf: "2026-08-17", sourceFile: "BVBG.086.01_2026-08-17.xml", sourceHashSha256: HASH_A },
    rateLineage: { sourceId: "B3_DI1_CURVE", sourceAsOf: "2026-08-17", sourceHashSha256: HASH_A },
    ...overrides,
  };
}

describe("calculateB3OptionPremiumMtmGreeks", () => {
  it("extrai volatilidade implícita e Greeks a partir de um prêmio de liquidação B3 real e rotula o modelo como aproximação", () => {
    const result = calculateB3OptionPremiumMtmGreeks(baseInput());
    expect(result.pricingModel).toBe("BLACK_76_EUROPEAN_APPROXIMATION");
    expect(result.impliedVolatilityConverged).toBe(true);
    expect(result.impliedVolatilityAnnual).toBeGreaterThan(0);
    expect(result.greeks.delta).toBeGreaterThan(0);
    expect(result.greeks.delta).toBeLessThan(1);
    expect(result.blockedMetrics).toContain("official_b3_binomial_replication");
  });

  it("a volatilidade implícita extraída reproduz o prêmio observado (round-trip via Black-76)", () => {
    const result = calculateB3OptionPremiumMtmGreeks(baseInput());
    const recomputed = black76Premium({ optionType: "CALL", futuresPrice: 5.35, strike: 5.20, yearsToExpiry: result.yearsToExpiry, riskFreeRateAnnual: 0.12, volatilityAnnual: result.impliedVolatilityAnnual });
    expect(recomputed).toBeCloseTo(0.18, 6);
  });

  it("calcula o ajuste diário (MTM) quando o prêmio do dia anterior é informado, com sinal correto para posição comprada e vendida", () => {
    const long = calculateB3OptionPremiumMtmGreeks(baseInput({
      previousOptionPremium: 0.15,
      previousPremiumLineage: { sourceId: "B3_PUBLIC_FILES", sourceAsOf: "2026-08-14", sourceFile: "BVBG.086.01_2026-08-14.xml", sourceHashSha256: HASH_B },
    }));
    expect(long.dailyMtm).not.toBeNull();
    expect(long.dailyMtm!.perContract).toBeCloseTo(50_000 * (0.18 - 0.15), 6);
    expect(long.dailyMtm!.grossResult).toBeCloseTo(10 * 50_000 * (0.18 - 0.15), 6);

    const short = calculateB3OptionPremiumMtmGreeks(baseInput({
      optionPosition: "SHORT", previousOptionPremium: 0.15,
      previousPremiumLineage: { sourceId: "B3_PUBLIC_FILES", sourceAsOf: "2026-08-14", sourceFile: "BVBG.086.01_2026-08-14.xml", sourceHashSha256: HASH_B },
    }));
    expect(short.dailyMtm!.grossResult).toBeCloseTo(-long.dailyMtm!.grossResult, 6);
  });

  it("não calcula MTM quando o prêmio do dia anterior não é informado", () => {
    const result = calculateB3OptionPremiumMtmGreeks(baseInput());
    expect(result.dailyMtm).toBeNull();
  });

  it("exige linhagem B3 completa (hash SHA-256) para o prêmio do dia", () => {
    expect(() => calculateB3OptionPremiumMtmGreeks(baseInput({ premiumLineage: { sourceId: "B3_PUBLIC_FILES", sourceAsOf: "2026-08-17", sourceFile: "x.xml", sourceHashSha256: "not-a-hash" } }))).toThrow("hash SHA-256");
  });

  it("exige linhagem do prêmio anterior completa quando o MTM diário é solicitado", () => {
    expect(() => calculateB3OptionPremiumMtmGreeks(baseInput({ previousOptionPremium: 0.15 }))).toThrow("mesma linhagem B3 completa");
  });

  it("bloqueia quando o prêmio B3 observado viola não-arbitragem (propaga o erro do solver)", () => {
    expect(() => calculateB3OptionPremiumMtmGreeks(baseInput({ observedOptionPremium: 0.001 }))).toThrow("não-arbitragem");
  });

  it("rejeita contratos não inteiros ou não positivos", () => {
    expect(() => calculateB3OptionPremiumMtmGreeks(baseInput({ contracts: 0 }))).toThrow("contratos");
    expect(() => calculateB3OptionPremiumMtmGreeks(baseInput({ contracts: 1.5 }))).toThrow("contratos");
  });
});

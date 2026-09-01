import { describe, expect, it } from "vitest";
import { black76Greeks, black76ImpliedVolatility, black76Premium, yearsToExpiryBase252 } from "./optionPricing";

const BASE = { futuresPrice: 5.20, strike: 5.20, yearsToExpiry: 0.25, riskFreeRateAnnual: 0.12, volatilityAnnual: 0.18 };

describe("Black-76 — premium", () => {
  it("call e put fora do dinheiro respeitam a paridade put-call sob a convenção de desconto base 252 do produto (não desconto contínuo)", () => {
    const offAtm = { ...BASE, futuresPrice: 5.50, strike: 5.20 };
    const call = black76Premium({ ...offAtm, optionType: "CALL" });
    const put = black76Premium({ ...offAtm, optionType: "PUT" });
    // Mesma convenção usada em ndfSettlement.ts/fxSwapScenario.ts: DF = (1+r)^(-T), não e^{-rT}.
    const discreteDiscount = Math.pow(1 + BASE.riskFreeRateAnnual, -offAtm.yearsToExpiry);
    expect(call - put).toBeCloseTo(discreteDiscount * (offAtm.futuresPrice - offAtm.strike), 8);
  });

  it("call e put no dinheiro (ATM) respeitam a paridade put-call: C − P = DF(F − K)", () => {
    const call = black76Premium({ ...BASE, optionType: "CALL" });
    const put = black76Premium({ ...BASE, optionType: "PUT" });
    const discount = Math.pow(1 + BASE.riskFreeRateAnnual, -BASE.yearsToExpiry);
    expect(call - put).toBeCloseTo(discount * (BASE.futuresPrice - BASE.strike), 8);
  });

  it("prêmio nunca fica abaixo do valor intrínseco descontado (não-arbitragem)", () => {
    const deepItmCall = black76Premium({ ...BASE, optionType: "CALL", strike: 4.0 });
    const discount = Math.pow(1 + BASE.riskFreeRateAnnual, -BASE.yearsToExpiry);
    expect(deepItmCall).toBeGreaterThanOrEqual(discount * (BASE.futuresPrice - 4.0) - 1e-9);
  });

  it("rejeita tempo até o vencimento não positivo", () => {
    expect(() => black76Premium({ ...BASE, optionType: "CALL", yearsToExpiry: 0 })).toThrow("tempo até o vencimento");
  });
});

describe("Black-76 — Greeks batem com diferenças finitas (validação numérica independente da derivação analítica)", () => {
  const epsilon = 1e-4;

  it("delta ≈ dV/dF por diferença finita central", () => {
    for (const optionType of ["CALL", "PUT"] as const) {
      const up = black76Premium({ ...BASE, optionType, futuresPrice: BASE.futuresPrice + epsilon });
      const down = black76Premium({ ...BASE, optionType, futuresPrice: BASE.futuresPrice - epsilon });
      const numericDelta = (up - down) / (2 * epsilon);
      const { delta } = black76Greeks({ ...BASE, optionType });
      expect(delta).toBeCloseTo(numericDelta, 4);
    }
  });

  it("gamma ≈ d²V/dF² por diferença finita central", () => {
    const up = black76Premium({ ...BASE, optionType: "CALL", futuresPrice: BASE.futuresPrice + epsilon });
    const mid = black76Premium({ ...BASE, optionType: "CALL" });
    const down = black76Premium({ ...BASE, optionType: "CALL", futuresPrice: BASE.futuresPrice - epsilon });
    const numericGamma = (up - 2 * mid + down) / (epsilon * epsilon);
    const { gamma } = black76Greeks({ ...BASE, optionType: "CALL" });
    expect(gamma).toBeCloseTo(numericGamma, 1);
  });

  it("vega ≈ dV/dσ por diferença finita central (por 1 ponto percentual)", () => {
    const volEpsilon = 1e-4;
    const up = black76Premium({ ...BASE, optionType: "CALL", volatilityAnnual: BASE.volatilityAnnual + volEpsilon });
    const down = black76Premium({ ...BASE, optionType: "CALL", volatilityAnnual: BASE.volatilityAnnual - volEpsilon });
    const numericVegaPerUnit = (up - down) / (2 * volEpsilon);
    const { vegaPer1PctVol } = black76Greeks({ ...BASE, optionType: "CALL" });
    expect(vegaPer1PctVol * 100).toBeCloseTo(numericVegaPerUnit, 4);
  });

  it("theta ≈ −dV/dT por diferença finita central (decaimento com a passagem do tempo)", () => {
    for (const optionType of ["CALL", "PUT"] as const) {
      const timeEpsilon = 1e-5;
      const later = black76Premium({ ...BASE, optionType, yearsToExpiry: BASE.yearsToExpiry - timeEpsilon });
      const earlier = black76Premium({ ...BASE, optionType, yearsToExpiry: BASE.yearsToExpiry + timeEpsilon });
      const numericThetaAnnual = (later - earlier) / (2 * timeEpsilon);
      const { thetaPerCalendarDay } = black76Greeks({ ...BASE, optionType });
      expect(thetaPerCalendarDay * 365).toBeCloseTo(numericThetaAnnual, 2);
    }
  });
});

describe("Black-76 — volatilidade implícita", () => {
  it("recupera a volatilidade usada para gerar o prêmio (round-trip)", () => {
    const premium = black76Premium({ ...BASE, optionType: "CALL" });
    const result = black76ImpliedVolatility({ optionType: "CALL", futuresPrice: BASE.futuresPrice, strike: BASE.strike, yearsToExpiry: BASE.yearsToExpiry, riskFreeRateAnnual: BASE.riskFreeRateAnnual, observedPremium: premium });
    expect(result.converged).toBe(true);
    expect(result.volatilityAnnual).toBeCloseTo(BASE.volatilityAnnual, 6);
  });

  it("bloqueia quando o prêmio observado viola não-arbitragem (abaixo do intrínseco descontado)", () => {
    expect(() => black76ImpliedVolatility({ optionType: "CALL", futuresPrice: 6.0, strike: 5.0, yearsToExpiry: 0.25, riskFreeRateAnnual: 0.12, observedPremium: 0.01 })).toThrow("não-arbitragem");
  });

  it("bloqueia quando o prêmio observado não contém valor temporal residual", () => {
    expect(() => black76ImpliedVolatility({ optionType: "CALL", futuresPrice: 5.0, strike: 5.0, yearsToExpiry: 0.25, riskFreeRateAnnual: 0, observedPremium: 0 })).toThrow("volatilidade implícita não é numericamente identificável");
  });
});

describe("yearsToExpiryBase252", () => {
  it("converte dias úteis (base 252) em fração de ano, consistente com a convenção DI1/ETTJ do produto", () => {
    const years = yearsToExpiryBase252("2026-08-17", "2026-11-16", "B3_TRADING_2026");
    expect(years).toBeGreaterThan(0.2);
    expect(years).toBeLessThan(0.3);
  });

  it("rejeita vencimento na data-base ou anterior a ela", () => {
    expect(() => yearsToExpiryBase252("2026-08-17", "2026-08-17", "B3_TRADING_2026")).toThrow("posterior à data-base");
  });
});

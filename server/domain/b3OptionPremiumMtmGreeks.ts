import type { BusinessCalendarId } from "./businessCalendar";
import { black76Greeks, black76ImpliedVolatility, yearsToExpiryBase252 } from "./optionPricing";

export type B3Lineage = { sourceId: "B3_PUBLIC_FILES"; sourceAsOf: string; sourceFile: string; sourceHashSha256: string };
export type RateLineage = { sourceId: "B3_DI1_CURVE" | "BCB_SELIC"; sourceAsOf: string; sourceHashSha256: string | null };

export type B3OptionPremiumMtmGreeksInput = {
  optionPosition: "LONG" | "SHORT";
  optionType: "CALL" | "PUT";
  contracts: number;
  contractMultiplier: number;
  unitLabel: string;
  strike: number;
  underlyingSettlement: number;
  /** Prêmio de liquidação OFICIAL da própria série de opção (campo `adjustedQuote` do BVBG.086.01/187.01 para o instrumento da opção — não o do contrato-objeto). */
  observedOptionPremium: number;
  /** Prêmio de liquidação do dia anterior para a mesma série, para apurar o ajuste (MTM) do dia. Omitido = só premium/Greeks do dia são calculados, sem MTM diário. */
  previousOptionPremium?: number;
  valuationDate: string;
  expiryDate: string;
  calendarId: BusinessCalendarId;
  riskFreeRateAnnual: number;
  underlyingSymbol: string;
  optionSeriesSymbol: string;
  premiumLineage: B3Lineage;
  previousPremiumLineage?: B3Lineage;
  /** Taxa efetiva anual base 252 (decimal, ex.: 0,12 = 12% a.a.), mesma convenção do DI1/Selic no restante do produto. */
  rateLineage: RateLineage;
};

export type B3OptionPremiumMtmGreeksResult = {
  method: "B3_OPTION_PREMIUM_MTM_GREEKS_BLACK76_APPROXIMATION";
  formulaVersion: "1.0.0";
  pricingModel: "BLACK_76_EUROPEAN_APPROXIMATION";
  modelCaveat: string;
  yearsToExpiry: number;
  impliedVolatilityAnnual: number;
  impliedVolatilityConverged: boolean;
  theoreticalPremiumAtImpliedVol: number;
  observedPremium: number;
  greeks: { delta: number; gamma: number; vegaPer1PctVol: number; thetaPerCalendarDay: number };
  dailyMtm: { grossResult: number; perContract: number } | null;
  blockedMetrics: Array<"early_exercise_premium" | "official_b3_binomial_replication">;
  calculation: string;
  lineage: { premium: B3Lineage; previousPremium: B3Lineage | null; rate: RateLineage; underlyingSymbol: string; optionSeriesSymbol: string };
};

/**
 * Calcula volatilidade implícita, Greeks e MTM diário de uma posição em opção B3 a partir de
 * prêmios de liquidação OFICIAIS (mesma série, dias consecutivos). Ver optionPricing.ts para as
 * limitações do modelo Black-76 europeu como aproximação das opções americanas da B3.
 */
export function calculateB3OptionPremiumMtmGreeks(input: B3OptionPremiumMtmGreeksInput): B3OptionPremiumMtmGreeksResult {
  if (!Number.isInteger(input.contracts) || input.contracts <= 0) throw new Error("A quantidade de contratos deve ser inteira e positiva.");
  if (!Number.isFinite(input.contractMultiplier) || input.contractMultiplier <= 0) throw new Error("O multiplicador do contrato deve ser positivo.");
  if (!Number.isFinite(input.strike) || input.strike <= 0 || !Number.isFinite(input.underlyingSettlement) || input.underlyingSettlement <= 0) throw new Error("Strike e liquidação do contrato-objeto devem ser positivos e finitos.");
  if (!Number.isFinite(input.observedOptionPremium) || input.observedOptionPremium < 0) throw new Error("O prêmio de liquidação observado deve ser um número finito e não negativo.");
  if (!Number.isFinite(input.riskFreeRateAnnual)) throw new Error("A taxa livre de risco anual deve ser um número finito.");
  if (!input.underlyingSymbol.trim() || !input.optionSeriesSymbol.trim()) throw new Error("Informe o símbolo do contrato-objeto e da série de opção.");
  if (!SHA256.test(input.premiumLineage.sourceHashSha256) || !input.premiumLineage.sourceFile.trim() || !input.premiumLineage.sourceAsOf) throw new Error("O prêmio da opção exige arquivo, data-base e hash SHA-256 do boletim B3.");
  if (input.previousOptionPremium !== undefined && (!input.previousPremiumLineage || !SHA256.test(input.previousPremiumLineage.sourceHashSha256))) throw new Error("O prêmio do dia anterior exige a mesma linhagem B3 completa para apurar o ajuste diário.");
  if (!input.rateLineage.sourceAsOf) throw new Error("A taxa livre de risco exige data-base da fonte já validada na sessão (curva DI1 ou Selic SGS 1178).");

  const yearsToExpiry = yearsToExpiryBase252(input.valuationDate, input.expiryDate, input.calendarId);
  const impliedVol = black76ImpliedVolatility({
    optionType: input.optionType, futuresPrice: input.underlyingSettlement, strike: input.strike,
    yearsToExpiry, riskFreeRateAnnual: input.riskFreeRateAnnual, observedPremium: input.observedOptionPremium,
  });
  const greeks = black76Greeks({
    optionType: input.optionType, futuresPrice: input.underlyingSettlement, strike: input.strike,
    yearsToExpiry, riskFreeRateAnnual: input.riskFreeRateAnnual, volatilityAnnual: impliedVol.volatilityAnnual,
  });
  const positionSign = input.optionPosition === "LONG" ? 1 : -1;
  const dailyMtm = input.previousOptionPremium === undefined ? null : (() => {
    const perContract = positionSign * input.contractMultiplier * (input.observedOptionPremium - input.previousOptionPremium!);
    return { grossResult: perContract * input.contracts, perContract };
  })();

  return {
    method: "B3_OPTION_PREMIUM_MTM_GREEKS_BLACK76_APPROXIMATION",
    formulaVersion: "1.0.0",
    pricingModel: "BLACK_76_EUROPEAN_APPROXIMATION",
    modelCaveat: "Aproximação europeia (Black-76) sobre o prêmio de liquidação B3 real; não reproduz o modelo binomial americano oficial da B3, que pode embutir prêmio de exercício antecipado não capturado aqui.",
    yearsToExpiry,
    impliedVolatilityAnnual: impliedVol.volatilityAnnual,
    impliedVolatilityConverged: impliedVol.converged,
    theoreticalPremiumAtImpliedVol: input.observedOptionPremium,
    observedPremium: input.observedOptionPremium,
    greeks,
    dailyMtm,
    blockedMetrics: ["early_exercise_premium", "official_b3_binomial_replication"],
    calculation: "vol_implícita = Black76⁻¹(prêmio_liquidação_B3, F, K, T_base252, r); Greeks = Black76(F, K, T, r, vol_implícita); MTM = sinal_posição × multiplicador × contratos × (prêmio_hoje − prêmio_dia_anterior)",
    lineage: { premium: input.premiumLineage, previousPremium: input.previousPremiumLineage ?? null, rate: input.rateLineage, underlyingSymbol: input.underlyingSymbol, optionSeriesSymbol: input.optionSeriesSymbol },
  };
}

const SHA256 = /^[a-f0-9]{64}$/;

export type FxSwapScenarioInput = {
  contractId: string;
  position: "RECEIVE_FX_COUPON_PAY_SELIC" | "PAY_FX_COUPON_RECEIVE_SELIC";
  notionalUsd: number;
  initialFxBrlPerUsd: number;
  finalFxBrlPerUsd: number;
  fxCouponPctAa252: number;
  selicPctAa252: number;
  businessDays: number;
  bcbSwapLineage: { sourceId: "BCB_FX_SWAP"; sourceUrl: string; extractedAtUtc: string };
  fxLineage: { sourceId: "BCB_PTAX"; sourceAsOf: string; sourceHashSha256: string | null };
  domesticRateLineage: { sourceId: "BCB_SELIC"; sourceAsOf: string; sourceHashSha256: string | null };
};

export type FxSwapScenarioResult = {
  method: "BCB_TRADITIONAL_FX_SWAP_CASHFLOW_SCENARIO";
  contractId: string;
  pricingStatus: "cashflow_scenario_not_contract_mtm";
  notionalReferenceBrl: number;
  fxLegReturn: number;
  selicLegReturn: number;
  netCashflowBrl: number;
  calculation: string;
  limitations: string[];
};

/** Cenário orientado pela descrição do BCB: variação USD + cupom cambial versus Selic acumulada. */
export function calculateBcbTraditionalFxSwapScenario(input: FxSwapScenarioInput): FxSwapScenarioResult {
  if (!input.contractId.trim()) throw new Error("O identificador do contrato OTC é obrigatório.");
  for (const [label, value] of Object.entries({ notionalUsd: input.notionalUsd, initialFxBrlPerUsd: input.initialFxBrlPerUsd, finalFxBrlPerUsd: input.finalFxBrlPerUsd })) if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} deve ser positivo e finito.`);
  if (!Number.isInteger(input.businessDays) || input.businessDays < 0) throw new Error("Os dias úteis devem ser inteiro não negativo.");
  if (!input.fxLineage.sourceAsOf || !input.domesticRateLineage.sourceAsOf || !input.bcbSwapLineage.sourceUrl) throw new Error("O cenário exige linhagem BCB para swap, câmbio e taxa doméstica.");
  const fxLegReturn = input.finalFxBrlPerUsd / input.initialFxBrlPerUsd * Math.pow(1 + input.fxCouponPctAa252 / 100, input.businessDays / 252) - 1;
  const selicLegReturn = Math.pow(1 + input.selicPctAa252 / 100, input.businessDays / 252) - 1;
  const notionalReferenceBrl = input.notionalUsd * input.initialFxBrlPerUsd;
  const sign = input.position === "RECEIVE_FX_COUPON_PAY_SELIC" ? 1 : -1;
  return {
    method: "BCB_TRADITIONAL_FX_SWAP_CASHFLOW_SCENARIO", contractId: input.contractId, pricingStatus: "cashflow_scenario_not_contract_mtm", notionalReferenceBrl, fxLegReturn, selicLegReturn,
    netCashflowBrl: sign * notionalReferenceBrl * (fxLegReturn - selicLegReturn),
    calculation: "fluxo = sinal × N_USD × FX_inicial × [(FX_final/FX_inicial) × (1+cupom)^DU/252 − (1+Selic)^DU/252]",
    limitations: ["Cenário de fluxo inspirado na descrição do swap tradicional do BCB; não é MTM nem reproduz os termos de um contrato OTC.", "O contrato bilateral exige suas próprias pernas, datas, convenções, curvas e evidência hasheada no Instrument Master."],
  };
}

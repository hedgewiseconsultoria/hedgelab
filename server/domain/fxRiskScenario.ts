export type EconomicDirection = "RECEIVABLE" | "PAYABLE";

export type FxStressInput = {
  exposureUsd: number;
  economicDirection: EconomicDirection;
  ptaxSale: number;
  fxShockPct: number;
};

export type FxStressResult = {
  method: "PTAX_FX_SHOCK";
  formulaVersion: "1.0.0";
  referenceRate: number;
  stressedRate: number;
  fxShockPct: number;
  exposureUsd: number;
  economicDirection: EconomicDirection;
  pnlBrl: number;
  signedDeltaBrlPerOnePercent: number;
  calculationMemory: string[];
};

export type ParametricVarInput = {
  exposureBrl: number;
  dailyVolatilityPct: number;
  holdingPeriodBusinessDays: number;
  confidenceLevel: number;
};

export type ParametricVarResult = {
  method: "NORMAL_PARAMETRIC_VAR";
  formulaVersion: "1.0.0";
  exposureBrl: number;
  dailyVolatilityPct: number;
  holdingPeriodBusinessDays: number;
  confidenceLevel: number;
  normalQuantile: number;
  varBrl: number;
  calculationMemory: string[];
};

export type ResidualRiskInput = {
  grossExposureBrl: number;
  hedgeEquivalentExposureBrl: number;
  dailyVolatilityPct: number;
  holdingPeriodBusinessDays: number;
  confidenceLevel: number;
  lineage: { valuationAsOf: string; sourceIds: string[] };
};

export type ResidualRiskResult = {
  method: "RESIDUAL_EXPOSURE_PARAMETRIC_VAR";
  formulaVersion: "1.0.0";
  grossExposureBrl: number;
  hedgeEquivalentExposureBrl: number;
  residualExposureBrl: number;
  coveragePct: number;
  residualVarBrl: number;
  calculationMemory: string[];
  lineage: ResidualRiskInput["lineage"];
};

function assertPositiveFinite(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} deve ser positivo e finito.`);
}

/** Aproximação racional da inversa da CDF normal padrão, aplicada apenas a parâmetros fornecidos pelo usuário. */
export function inverseStandardNormal(probability: number): number {
  if (!Number.isFinite(probability) || probability <= 0 || probability >= 1) throw new Error("O nível de confiança deve estar entre 0 e 1.");
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  let q: number;
  let r: number;
  if (probability < pLow) {
    q = Math.sqrt(-2 * Math.log(probability));
    return (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) / ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1);
  }
  if (probability > pHigh) {
    q = Math.sqrt(-2 * Math.log(1 - probability));
    return -(((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) / ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1);
  }
  q = probability - 0.5;
  r = q * q;
  return (((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r + a[5]!) * q / (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1);
}

export function calculateFxStress(input: FxStressInput): FxStressResult {
  assertPositiveFinite(input.exposureUsd, "A exposição em USD");
  assertPositiveFinite(input.ptaxSale, "A PTAX de venda");
  if (!Number.isFinite(input.fxShockPct) || input.fxShockPct <= -1) throw new Error("O choque cambial deve ser finito e superior a -100%.");
  const stressedRate = input.ptaxSale * (1 + input.fxShockPct);
  const directionSignal = input.economicDirection === "RECEIVABLE" ? 1 : -1;
  const pnlBrl = directionSignal * input.exposureUsd * (stressedRate - input.ptaxSale);
  const signedDeltaBrlPerOnePercent = directionSignal * input.exposureUsd * input.ptaxSale * 0.01;
  return {
    method: "PTAX_FX_SHOCK",
    formulaVersion: "1.0.0",
    referenceRate: input.ptaxSale,
    stressedRate,
    fxShockPct: input.fxShockPct,
    exposureUsd: input.exposureUsd,
    economicDirection: input.economicDirection,
    pnlBrl,
    signedDeltaBrlPerOnePercent,
    calculationMemory: [
      "Taxa estressada = PTAX de venda × (1 + choque cambial).",
      "P&L econômico = sinal da exposição × nocional em USD × (taxa estressada − taxa de referência).",
      "Este cenário não inclui custo de hedge, spread, basis, margem, volatilidade implícita ou preço de derivativo.",
    ],
  };
}

export function calculateParametricVar(input: ParametricVarInput): ParametricVarResult {
  assertPositiveFinite(Math.abs(input.exposureBrl), "A exposição em BRL");
  assertPositiveFinite(input.dailyVolatilityPct, "A volatilidade diária");
  if (!Number.isInteger(input.holdingPeriodBusinessDays) || input.holdingPeriodBusinessDays <= 0) throw new Error("O horizonte deve ser um número inteiro positivo de dias úteis.");
  const normalQuantile = inverseStandardNormal(input.confidenceLevel);
  const varBrl = Math.abs(input.exposureBrl) * input.dailyVolatilityPct * Math.sqrt(input.holdingPeriodBusinessDays) * normalQuantile;
  return {
    method: "NORMAL_PARAMETRIC_VAR",
    formulaVersion: "1.0.0",
    exposureBrl: input.exposureBrl,
    dailyVolatilityPct: input.dailyVolatilityPct,
    holdingPeriodBusinessDays: input.holdingPeriodBusinessDays,
    confidenceLevel: input.confidenceLevel,
    normalQuantile,
    varBrl,
    calculationMemory: [
      "VaR = |exposição em BRL| × volatilidade diária informada × √(dias úteis) × quantil normal do nível de confiança.",
      "A volatilidade é uma entrada informada pelo usuário; o resultado não presume uma série de volatilidade oficial.",
      "O resultado é uma estimativa paramétrica e não substitui backtesting, validação de modelo ou política de risco.",
    ],
  };
}

/** VaR paramétrico aplicado à exposição líquida informada após a equivalência econômica do hedge. */
export function calculateResidualRisk(input: ResidualRiskInput): ResidualRiskResult {
  if (!Number.isFinite(input.grossExposureBrl) || input.grossExposureBrl === 0 || !Number.isFinite(input.hedgeEquivalentExposureBrl)) throw new Error("A exposição bruta deve ser não nula e as exposições devem ser finitas.");
  if (!input.lineage.valuationAsOf || input.lineage.sourceIds.length === 0) throw new Error("O risco residual exige data-base e pelo menos uma fonte de linhagem.");
  const residualExposureBrl = input.grossExposureBrl + input.hedgeEquivalentExposureBrl;
  const coveragePct = 1 - Math.abs(residualExposureBrl / input.grossExposureBrl);
  const parametricVar = calculateParametricVar({ exposureBrl: residualExposureBrl === 0 ? Number.EPSILON : residualExposureBrl, dailyVolatilityPct: input.dailyVolatilityPct, holdingPeriodBusinessDays: input.holdingPeriodBusinessDays, confidenceLevel: input.confidenceLevel });
  return {
    method: "RESIDUAL_EXPOSURE_PARAMETRIC_VAR", formulaVersion: "1.0.0", grossExposureBrl: input.grossExposureBrl, hedgeEquivalentExposureBrl: input.hedgeEquivalentExposureBrl, residualExposureBrl, coveragePct, residualVarBrl: residualExposureBrl === 0 ? 0 : parametricVar.varBrl,
    calculationMemory: ["Exposição residual = exposição bruta + exposição equivalente do hedge, preservando os sinais econômicos.", "Cobertura = 1 − |exposição residual / exposição bruta|; cobertura negativa indica sobreposição maior que a exposição bruta.", ...parametricVar.calculationMemory], lineage: input.lineage,
  };
}

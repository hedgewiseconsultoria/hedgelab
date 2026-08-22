export type CommodityEconomicDirection = "BUY" | "SELL";
export type CommodityScenarioStrategy = "UNHEDGED" | "FUTURE" | "PROTECTIVE_OPTION";

export type CommodityStrategyScenarioInput = {
  economicDirection: CommodityEconomicDirection;
  strategy: CommodityScenarioStrategy;
  exposureQuantity: number;
  coveragePct: number;
  referencePrice: number;
  scenarioPrice: number;
  optionStrike?: number;
};

export type CommodityStrategyScenarioResult = {
  strategy: CommodityScenarioStrategy;
  coveredQuantity: number;
  residualQuantity: number;
  physicalEconomicImpact: number;
  hedgeEconomicImpact: number;
  combinedEconomicImpact: number;
  methodStatus: "didactic_user_parameterized";
  formula: string;
  limitations: string[];
};

function positiveFinite(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} deve ser positivo e finito.`);
}

/**
 * Compara somente a variação econômica até o vencimento, na mesma unidade de
 * cotação e sem conversão de moeda/unidade. O preço é uma hipótese declarada;
 * não há preço B3, ajuste diário, margem, base, prêmio, MTM ou Greeks aqui.
 */
export function calculateCommodityStrategyScenario(input: CommodityStrategyScenarioInput): CommodityStrategyScenarioResult {
  positiveFinite(input.exposureQuantity, "A quantidade exposta");
  positiveFinite(input.referencePrice, "O preço de referência");
  positiveFinite(input.scenarioPrice, "O preço de cenário");
  if (!Number.isFinite(input.coveragePct) || input.coveragePct < 0 || input.coveragePct > 100) throw new Error("O percentual de cobertura deve estar entre 0% e 100%.");
  if (input.strategy === "PROTECTIVE_OPTION") positiveFinite(input.optionStrike ?? Number.NaN, "O strike da opção");

  const coverageRatio = input.coveragePct / 100;
  const coveredQuantity = input.exposureQuantity * coverageRatio;
  const residualQuantity = input.exposureQuantity - coveredQuantity;
  const priceVariation = input.scenarioPrice - input.referencePrice;
  const physicalEconomicImpact = input.economicDirection === "BUY"
    ? -input.exposureQuantity * priceVariation
    : input.exposureQuantity * priceVariation;

  if (input.strategy === "UNHEDGED") {
    return {
      strategy: input.strategy,
      coveredQuantity: 0,
      residualQuantity: input.exposureQuantity,
      physicalEconomicImpact,
      hedgeEconomicImpact: 0,
      combinedEconomicImpact: physicalEconomicImpact,
      methodStatus: "didactic_user_parameterized",
      formula: "impacto físico = direção econômica × quantidade exposta × (preço de cenário − preço de referência)",
      limitations: ["Hipótese didática declarada pelo usuário; não representa observação B3.", "Não considera custo operacional, frete, base, impostos, margem ou ajuste diário."],
    };
  }

  if (input.strategy === "FUTURE") {
    const hedgeEconomicImpact = input.economicDirection === "BUY"
      ? coveredQuantity * priceVariation
      : -coveredQuantity * priceVariation;
    return {
      strategy: input.strategy,
      coveredQuantity,
      residualQuantity,
      physicalEconomicImpact,
      hedgeEconomicImpact,
      combinedEconomicImpact: physicalEconomicImpact + hedgeEconomicImpact,
      methodStatus: "didactic_user_parameterized",
      formula: "resultado do futuro = posição econômica oposta × quantidade coberta × (preço de cenário − preço de referência)",
      limitations: ["Cenário linear didático e homogêneo por unidade; não é preço, ajuste ou P&L B3.", "Não considera base, vencimento específico, margem, ajuste diário, custos, liquidez ou rolagem."],
    };
  }

  const strike = input.optionStrike!;
  const intrinsicPerUnit = input.economicDirection === "BUY"
    ? Math.max(0, input.scenarioPrice - strike)
    : Math.max(0, strike - input.scenarioPrice);
  const hedgeEconomicImpact = coveredQuantity * intrinsicPerUnit;
  return {
    strategy: input.strategy,
    coveredQuantity,
    residualQuantity,
    physicalEconomicImpact,
    hedgeEconomicImpact,
    combinedEconomicImpact: physicalEconomicImpact + hedgeEconomicImpact,
    methodStatus: "didactic_user_parameterized",
    formula: input.economicDirection === "BUY"
      ? "intrínseco da call = quantidade coberta × máx(0, preço de cenário − strike)"
      : "intrínseco da put = quantidade coberta × máx(0, strike − preço de cenário)",
    limitations: ["Exibe apenas intrínseco didático no vencimento; não inclui prêmio, valor temporal, MTM, volatilidade implícita ou Greeks.", "Uma opção efetiva só pode ser vinculada após seleção de série, strike e evidência B3 ou contrato comprovado."],
  };
}

export type LinearFuturesScenarioInput = {
  scenarioId: string;
  instrumentLabel: string;
  economicDirection: "BUY" | "SELL";
  hedgePosition: "LONG" | "SHORT";
  exposureQuantity: number;
  hedgeContracts: number;
  contractUnitQuantity: number;
  initialPrice: number;
  scenarioPrice: number;
  quotationUnit: string;
  dataMode: "USER_PARAMETERIZED_SCENARIO" | "B3_OBSERVED_PRICES";
  lineage: {
    sourceId: "USER_PARAMETERIZED_SCENARIO" | "B3_PUBLIC_FILES";
    sourceFile: string;
    sourceHashSha256: string | null;
    sourceAsOf: string | null;
    createdAtUtc: string;
  };
};

export type LinearFuturesScenarioResult = {
  scenarioId: string;
  instrumentLabel: string;
  priceChangePerUnit: number;
  unhedgedEconomicResult: number;
  futuresResult: number;
  combinedResult: number;
  residualResult: number;
  hedgeCoverageRatio: number;
  quotationUnit: string;
  dataMode: LinearFuturesScenarioInput["dataMode"];
  lineage: LinearFuturesScenarioInput["lineage"];
  limitations: string[];
};

function positive(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} deve ser positivo e finito.`);
}

function presentationNumber(value: number) {
  return Number(value.toFixed(8));
}

/**
 * Cenário linear de resultado bruto, adequado apenas quando exposição e contrato
 * usam a mesma unidade econômica declarada. Não reproduz ajuste, margem, base,
 * liquidação ou a metodologia de preço da B3.
 */
export function calculateLinearFuturesScenario(input: LinearFuturesScenarioInput): LinearFuturesScenarioResult {
  if (!input.scenarioId.trim() || !input.instrumentLabel.trim() || !input.quotationUnit.trim()) throw new Error("Identificador, instrumento e unidade de cotação são obrigatórios.");
  if (/^(DI1|FRA)/i.test(input.instrumentLabel.trim())) throw new Error("O cenário linear não se aplica a DI1 ou FRA; esses instrumentos exigem curva, PU e convenções de juros validados.");
  positive(input.exposureQuantity, "Quantidade da exposição");
  if (!Number.isInteger(input.hedgeContracts) || input.hedgeContracts < 0) throw new Error("Quantidade de contratos deve ser um inteiro não negativo.");
  positive(input.contractUnitQuantity, "Unidade por contrato");
  if (!Number.isFinite(input.initialPrice) || !Number.isFinite(input.scenarioPrice)) throw new Error("Preços inicial e de cenário devem ser finitos.");
  if (!input.lineage.sourceFile.trim() || !input.lineage.createdAtUtc) throw new Error("A linhagem do cenário deve identificar arquivo/origem e data de criação.");
  if (input.dataMode === "B3_OBSERVED_PRICES" && (input.lineage.sourceId !== "B3_PUBLIC_FILES" || !input.lineage.sourceHashSha256 || !input.lineage.sourceAsOf)) throw new Error("Preços B3 observados exigem arquivo, hash e data-base B3.");
  if (input.dataMode === "USER_PARAMETERIZED_SCENARIO" && input.lineage.sourceId !== "USER_PARAMETERIZED_SCENARIO") throw new Error("Cenário parametrizado deve manter a linhagem USER_PARAMETERIZED_SCENARIO.");
  if (input.dataMode === "USER_PARAMETERIZED_SCENARIO" && !input.lineage.sourceAsOf) throw new Error("Cenário parametrizado exige data-base explícita para referência didática.");

  const priceChangePerUnit = input.scenarioPrice - input.initialPrice;
  const unhedgedEconomicResult = (input.economicDirection === "SELL" ? 1 : -1) * input.exposureQuantity * priceChangePerUnit;
  const futuresResult = (input.hedgePosition === "LONG" ? 1 : -1) * input.hedgeContracts * input.contractUnitQuantity * priceChangePerUnit;
  const combinedResult = unhedgedEconomicResult + futuresResult;
  return {
    scenarioId: input.scenarioId,
    instrumentLabel: input.instrumentLabel,
    priceChangePerUnit: presentationNumber(priceChangePerUnit),
    unhedgedEconomicResult: presentationNumber(unhedgedEconomicResult),
    futuresResult: presentationNumber(futuresResult),
    combinedResult: presentationNumber(combinedResult),
    residualResult: presentationNumber(combinedResult),
    hedgeCoverageRatio: presentationNumber((input.hedgeContracts * input.contractUnitQuantity) / input.exposureQuantity),
    quotationUnit: input.quotationUnit,
    dataMode: input.dataMode,
    lineage: input.lineage,
    limitations: [
      "Resultado bruto linear; não representa ajuste diário, margem, custo de carregamento, liquidação, tributos ou risco de base.",
      "A comparabilidade depende de a unidade declarada da exposição coincidir com a unidade econômica por contrato.",
      input.dataMode === "USER_PARAMETERIZED_SCENARIO" ? "Os preços são parâmetros didáticos informados pelo usuário e não substituem observações B3." : "O uso de preços B3 observados não autoriza inferir vértices, forwards ou MTM fora da série identificada.",
    ],
  };
}

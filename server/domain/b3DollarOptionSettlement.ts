export type B3DollarOptionSettlementInput = {
  optionPosition: "LONG" | "SHORT";
  optionType: "CALL" | "PUT";
  contracts: number;
  strikeBrlPerUsd: number;
  underlyingSettlementBrlPerUsd: number;
  underlyingSymbol: string;
  b3Lineage: { sourceId: "B3_PUBLIC_FILES"; sourceAsOf: string; sourceFile: string; sourceHashSha256: string };
};

export type B3DollarOptionSettlementResult = {
  method: "B3_DOL_OPTION_INTRINSIC_SETTLEMENT_SCENARIO";
  formulaVersion: "1.0.0";
  contractSizeUsd: 50_000;
  intrinsicBrlPerUsd: number;
  grossExerciseBrl: number;
  exerciseEligibility: "in_the_money" | "out_of_the_money_or_at_the_money";
  pricingStatus: "intrinsic_settlement_scenario_not_option_mtm";
  blockedMetrics: Array<"premium_mtm" | "implied_volatility" | "greeks">;
  calculation: string;
  lineage: B3DollarOptionSettlementInput["b3Lineage"] & { underlyingSymbol: string };
};

/**
 * A ficha técnica B3 prevê exercício automático condicional à diferença entre
 * o preço de liquidação do contrato-objeto e o strike. O cálculo abaixo usa
 * somente essa parcela intrínseca: prêmio, volatilidade e Greeks ficam bloqueados.
 */
export function calculateB3DollarOptionIntrinsicSettlement(input: B3DollarOptionSettlementInput): B3DollarOptionSettlementResult {
  if (!Number.isInteger(input.contracts) || input.contracts <= 0) throw new Error("A quantidade de contratos deve ser inteira e positiva.");
  if (!Number.isFinite(input.strikeBrlPerUsd) || input.strikeBrlPerUsd <= 0 || !Number.isFinite(input.underlyingSettlementBrlPerUsd) || input.underlyingSettlementBrlPerUsd <= 0) throw new Error("Strike e preço de liquidação devem ser positivos e finitos.");
  if (!input.underlyingSymbol.trim() || !input.b3Lineage.sourceAsOf || !input.b3Lineage.sourceFile || !/^[a-f0-9]{64}$/.test(input.b3Lineage.sourceHashSha256)) throw new Error("O cenário exige símbolo, data-base, arquivo e hash SHA-256 do boletim B3.");
  const rawIntrinsic = input.optionType === "CALL" ? input.underlyingSettlementBrlPerUsd - input.strikeBrlPerUsd : input.strikeBrlPerUsd - input.underlyingSettlementBrlPerUsd;
  const intrinsicBrlPerUsd = Math.max(rawIntrinsic, 0);
  const direction = input.optionPosition === "LONG" ? 1 : -1;
  return {
    method: "B3_DOL_OPTION_INTRINSIC_SETTLEMENT_SCENARIO", formulaVersion: "1.0.0", contractSizeUsd: 50_000, intrinsicBrlPerUsd,
    grossExerciseBrl: direction * input.contracts * 50_000 * intrinsicBrlPerUsd,
    exerciseEligibility: intrinsicBrlPerUsd > 0 ? "in_the_money" : "out_of_the_money_or_at_the_money",
    pricingStatus: "intrinsic_settlement_scenario_not_option_mtm", blockedMetrics: ["premium_mtm", "implied_volatility", "greeks"],
    calculation: "resultado = sinal × contratos × USD 50.000 × max(sinal_opção × (preço_liquidação_B3 − strike), 0)",
    lineage: { ...input.b3Lineage, underlyingSymbol: input.underlyingSymbol },
  };
}

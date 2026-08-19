export type B3CornOptionSettlementInput = {
  optionPosition: "LONG" | "SHORT";
  optionType: "CALL" | "PUT";
  contracts: number;
  strikeBrlPerSack: number;
  underlyingSettlementBrlPerSack: number;
  underlyingSymbol: string;
  b3Lineage: { sourceId: "B3_PUBLIC_FILES"; sourceAsOf: string; sourceFile: string; sourceHashSha256: string };
};

export type B3CornOptionSettlementResult = {
  method: "B3_CCM_OPTION_INTRINSIC_SETTLEMENT_SCENARIO";
  formulaVersion: "1.0.0";
  contractSizeSacks60Kg: 450;
  exerciseStyle: "AMERICAN";
  intrinsicBrlPerSack: number;
  grossExerciseBrl: number;
  exerciseEligibility: "in_the_money" | "out_of_the_money_or_at_the_money";
  pricingStatus: "intrinsic_settlement_scenario_not_option_mtm";
  blockedMetrics: Array<"premium_mtm" | "implied_volatility" | "greeks">;
  calculation: string;
  lineage: B3CornOptionSettlementInput["b3Lineage"] & { underlyingSymbol: string; productSpecificationFile: string; productSpecificationHashSha256: string };
};

/** Ficha B3 CCM: opção americana, 450 sacas de 60 kg e exercício automático condicionado no vencimento. */
export function calculateB3CornOptionIntrinsicSettlement(input: B3CornOptionSettlementInput): B3CornOptionSettlementResult {
  if (!Number.isInteger(input.contracts) || input.contracts <= 0) throw new Error("A quantidade de contratos deve ser inteira e positiva.");
  if (!Number.isFinite(input.strikeBrlPerSack) || input.strikeBrlPerSack <= 0 || !Number.isFinite(input.underlyingSettlementBrlPerSack) || input.underlyingSettlementBrlPerSack <= 0) throw new Error("Strike e preço de liquidação devem ser positivos e finitos.");
  if (!input.underlyingSymbol.trim() || !input.b3Lineage.sourceAsOf || !input.b3Lineage.sourceFile || !/^[a-f0-9]{64}$/.test(input.b3Lineage.sourceHashSha256)) throw new Error("O cenário exige símbolo, data-base, arquivo e hash SHA-256 do boletim B3.");
  const rawIntrinsic = input.optionType === "CALL" ? input.underlyingSettlementBrlPerSack - input.strikeBrlPerSack : input.strikeBrlPerSack - input.underlyingSettlementBrlPerSack;
  const intrinsicBrlPerSack = Math.max(rawIntrinsic, 0);
  const direction = input.optionPosition === "LONG" ? 1 : -1;
  return { method: "B3_CCM_OPTION_INTRINSIC_SETTLEMENT_SCENARIO", formulaVersion: "1.0.0", contractSizeSacks60Kg: 450, exerciseStyle: "AMERICAN", intrinsicBrlPerSack, grossExerciseBrl: direction * input.contracts * 450 * intrinsicBrlPerSack, exerciseEligibility: intrinsicBrlPerSack > 0 ? "in_the_money" : "out_of_the_money_or_at_the_money", pricingStatus: "intrinsic_settlement_scenario_not_option_mtm", blockedMetrics: ["premium_mtm", "implied_volatility", "greeks"], calculation: "resultado = sinal × contratos × 450 sacas × max(sinal_opção × (preço_liquidação_B3 − strike), 0)", lineage: { ...input.b3Lineage, underlyingSymbol: input.underlyingSymbol, productSpecificationFile: "ccm_opcao_especificacao.html", productSpecificationHashSha256: "513e72e4dc11b21b9f2a9300c72616941e9cbf4e864e292646c03e2dbc5b29d7" } };
}

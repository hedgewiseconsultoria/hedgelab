import { B3_FX_FUTURE_SPECS, type FxFutureSpecification } from "./instrumentMaster";

export type B3FxFutureSettlementInput = {
  contract: "DOL" | "WDO";
  position: "LONG_USD" | "SHORT_USD";
  contracts: number;
  previousSettlementQuoteBrlPerUsd1000: number;
  currentSettlementQuoteBrlPerUsd1000: number;
  previousB3Lineage: { sourceId: "B3_PUBLIC_FILES"; sourceAsOf: string; sourceFile: string; sourceHashSha256: string };
  currentB3Lineage: { sourceId: "B3_PUBLIC_FILES"; sourceAsOf: string; sourceFile: string; sourceHashSha256: string };
};

export type B3FxFutureSettlementResult = {
  method: "B3_FX_FUTURE_DAILY_SETTLEMENT_VARIATION";
  formulaVersion: "1.0.0";
  contract: "DOL" | "WDO";
  contractSizeUsd: number;
  quoteVariationBrlPerUsd1000: number;
  dailySettlementVariationBrl: number;
  status: "daily_settlement_variation_not_full_mtm";
  excluded: string[];
  lineage: Pick<B3FxFutureSettlementInput, "previousB3Lineage" | "currentB3Lineage">;
};

function assertB3Lineage(lineage: B3FxFutureSettlementInput["previousB3Lineage"], label: string) {
  if (!lineage.sourceAsOf || !lineage.sourceFile || !/^[a-f0-9]{64}$/.test(lineage.sourceHashSha256)) throw new Error(`${label} exige data-base, arquivo e hash SHA-256 do boletim B3.`);
}

/** Calcula a variação diária de ajuste; preço B3 é informado em BRL por USD 1.000. */
export function calculateB3FxFutureDailySettlement(input: B3FxFutureSettlementInput): B3FxFutureSettlementResult {
  if (!Number.isInteger(input.contracts) || input.contracts <= 0) throw new Error("A quantidade de contratos deve ser inteira e positiva.");
  if (!Number.isFinite(input.previousSettlementQuoteBrlPerUsd1000) || !Number.isFinite(input.currentSettlementQuoteBrlPerUsd1000)) throw new Error("Os preços de ajuste B3 devem ser finitos.");
  assertB3Lineage(input.previousB3Lineage, "O preço anterior");
  assertB3Lineage(input.currentB3Lineage, "O preço atual");
  const specification: FxFutureSpecification = B3_FX_FUTURE_SPECS[input.contract];
  const quoteVariationBrlPerUsd1000 = input.currentSettlementQuoteBrlPerUsd1000 - input.previousSettlementQuoteBrlPerUsd1000;
  const sign = input.position === "LONG_USD" ? 1 : -1;
  return {
    method: "B3_FX_FUTURE_DAILY_SETTLEMENT_VARIATION", formulaVersion: "1.0.0", contract: input.contract, contractSizeUsd: specification.contractSizeUsd,
    quoteVariationBrlPerUsd1000, dailySettlementVariationBrl: sign * input.contracts * specification.contractSizeUsd * quoteVariationBrlPerUsd1000 / 1_000,
    status: "daily_settlement_variation_not_full_mtm",
    excluded: ["margem de garantia", "emolumentos", "custos financeiros", "posição anterior ao último ajuste", "exposição econômica não vinculada"],
    lineage: { previousB3Lineage: input.previousB3Lineage, currentB3Lineage: input.currentB3Lineage },
  };
}

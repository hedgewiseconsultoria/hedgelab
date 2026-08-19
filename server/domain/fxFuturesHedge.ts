import { B3_FX_FUTURE_SPECS } from "./instrumentMaster";

export const B3_FX_FUTURES = B3_FX_FUTURE_SPECS;

export type FxFutureCode = keyof typeof B3_FX_FUTURES;
export type RoundingPolicy = "FLOOR" | "NEAREST" | "CEILING";
export type EconomicDirection = "RECEIVABLE" | "PAYABLE";

export type FxFutureHedgeSizing = {
  method: "B3_FX_NOTIONAL_MATCHING";
  formulaVersion: "1.0.0";
  contract: FxFutureCode;
  contractSizeUsd: number;
  exposureUsd: number;
  rawContracts: number;
  roundingPolicy: RoundingPolicy;
  contracts: number;
  hedgedUsd: number;
  residualUsd: number;
  coverageRatio: number;
  economicDirection: EconomicDirection;
  notes: string[];
  sourceUrl: string;
};

function roundContracts(value: number, policy: RoundingPolicy): number {
  if (policy === "FLOOR") return Math.floor(value);
  if (policy === "CEILING") return Math.ceil(value);
  return Math.round(value);
}

export function sizeB3FxFutureHedge(input: {
  exposureUsd: number;
  economicDirection: EconomicDirection;
  contract: FxFutureCode;
  roundingPolicy: RoundingPolicy;
}): FxFutureHedgeSizing {
  if (!Number.isFinite(input.exposureUsd) || input.exposureUsd <= 0) {
    throw new Error("A exposição em USD deve ser positiva e finita.");
  }
  const specification = B3_FX_FUTURES[input.contract];
  const rawContracts = input.exposureUsd / specification.contractSizeUsd;
  const contracts = roundContracts(rawContracts, input.roundingPolicy);
  const hedgedUsd = contracts * specification.contractSizeUsd;
  const residualUsd = input.exposureUsd - hedgedUsd;

  return {
    method: "B3_FX_NOTIONAL_MATCHING",
    formulaVersion: "1.0.0",
    contract: input.contract,
    contractSizeUsd: specification.contractSizeUsd,
    exposureUsd: input.exposureUsd,
    rawContracts,
    roundingPolicy: input.roundingPolicy,
    contracts,
    hedgedUsd,
    residualUsd,
    coverageRatio: hedgedUsd / input.exposureUsd,
    economicDirection: input.economicDirection,
    notes: [
      "Dimensionamento por equivalência de nocional em USD; não representa recomendação de compra ou venda.",
      "Preço de ajuste, margem, custo financeiro, base, liquidação e risco de mercado não estão incluídos neste cálculo.",
      "A decisão operacional e a designação contábil exigem validação independente.",
    ],
    sourceUrl: specification.evidence.sourceUrl!,
  };
}

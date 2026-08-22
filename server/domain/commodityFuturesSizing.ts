import { B3_COMMODITY_FUTURE_SPECS } from "./instrumentMaster";

export type CommodityFutureContract = keyof typeof B3_COMMODITY_FUTURE_SPECS;
export type CommodityExposureUnit = "ARROBA" | "SACA_60KG" | "METRIC_TON" | "CUBIC_METER" | "TROY_OUNCE";
export type CommodityRoundingPolicy = "FLOOR" | "NEAREST" | "CEILING";

export type CommodityFutureSizingInput = {
  contract: CommodityFutureContract;
  exposureQuantity: number;
  exposureUnit: CommodityExposureUnit;
  roundingPolicy: CommodityRoundingPolicy;
};

export type CommodityFutureSizingResult = {
  contract: CommodityFutureContract;
  contracts: number;
  contractUnitQuantity: number;
  unit: CommodityExposureUnit;
  hedgedQuantity: number;
  residualQuantity: number;
  coverageRatio: number;
  sourceUrl: string;
  evidenceHashSha256: string;
  limitation: string;
};

function roundContracts(rawContracts: number, policy: CommodityRoundingPolicy) {
  if (policy === "FLOOR") return Math.floor(rawContracts);
  if (policy === "CEILING") return Math.ceil(rawContracts);
  return Math.round(rawContracts);
}

/** Dimensiona quantidade física homogênea; nunca converte arroba, saca e tonelada. */
export function sizeB3CommodityFutureHedge(input: CommodityFutureSizingInput): CommodityFutureSizingResult {
  const specification = B3_COMMODITY_FUTURE_SPECS[input.contract];
  if (!Number.isFinite(input.exposureQuantity) || input.exposureQuantity <= 0) throw new Error("A quantidade física exposta deve ser positiva e finita.");
  if (input.exposureUnit !== specification.contractUnit) throw new Error(`Dimensionamento bloqueado: ${input.contract} exige exposição em ${specification.contractUnit}; nenhuma conversão automática de unidade é permitida.`);
  const rawContracts = input.exposureQuantity / specification.contractSize;
  const contracts = roundContracts(rawContracts, input.roundingPolicy);
  const hedgedQuantity = contracts * specification.contractSize;
  return {
    contract: input.contract,
    contracts,
    contractUnitQuantity: specification.contractSize,
    unit: specification.contractUnit,
    hedgedQuantity,
    residualQuantity: input.exposureQuantity - hedgedQuantity,
    coverageRatio: hedgedQuantity / input.exposureQuantity,
    sourceUrl: specification.evidence.sourceUrl!,
    evidenceHashSha256: specification.evidence.sourceHashSha256!,
    limitation: "Dimensionamento exclusivamente por quantidade física na mesma unidade da ficha B3; não inclui conversão de unidade, preço, série, vencimento, ajuste, margem, base ou custo financeiro.",
  };
}

import { B3_COMMODITY_OPTION_SPECS } from "./instrumentMaster";
import type { CommodityExposureUnit, CommodityRoundingPolicy } from "./commodityFuturesSizing";

export type CommodityOptionContract = keyof typeof B3_COMMODITY_OPTION_SPECS;
export type CommodityOptionSizingInput = { contract: CommodityOptionContract; exposureQuantity: number; exposureUnit: CommodityExposureUnit; roundingPolicy: CommodityRoundingPolicy };
export type CommodityOptionSizingResult = { contract: CommodityOptionContract; contracts: number; contractUnitQuantity: number; unit: CommodityExposureUnit; referencedUnderlyingQuantity: number; residualQuantity: number; coverageRatio: number; sourceUrl: string; evidenceHashSha256: string; limitation: string };

function roundContracts(rawContracts: number, policy: CommodityRoundingPolicy) {
  if (policy === "FLOOR") return Math.floor(rawContracts);
  if (policy === "CEILING") return Math.ceil(rawContracts);
  return Math.round(rawContracts);
}

/** Dimensiona somente a equivalência física máxima do futuro-objeto da opção; não calcula delta, prêmio, probabilidade ou exercício. */
export function sizeB3CommodityOptionReference(input: CommodityOptionSizingInput): CommodityOptionSizingResult {
  const specification = B3_COMMODITY_OPTION_SPECS[input.contract];
  if (!Number.isFinite(input.exposureQuantity) || input.exposureQuantity <= 0) throw new Error("A quantidade física exposta deve ser positiva e finita.");
  if (input.exposureUnit !== specification.contractUnit) throw new Error(`Dimensionamento bloqueado: a opção ${input.contract} exige exposição em ${specification.contractUnit}; nenhuma conversão automática de unidade é permitida.`);
  const contracts = roundContracts(input.exposureQuantity / specification.contractSize, input.roundingPolicy);
  const referencedUnderlyingQuantity = contracts * specification.contractSize;
  return { contract: input.contract, contracts, contractUnitQuantity: specification.contractSize, unit: specification.contractUnit, referencedUnderlyingQuantity, residualQuantity: input.exposureQuantity - referencedUnderlyingQuantity, coverageRatio: referencedUnderlyingQuantity / input.exposureQuantity, sourceUrl: specification.evidence.sourceUrl!, evidenceHashSha256: specification.evidence.sourceHashSha256!, limitation: "Equivalência física máxima do futuro-objeto da opção na mesma unidade da ficha B3; não representa delta, prêmio, valor temporal, probabilidade de exercício, MTM, volatilidade implícita, Greeks, preço, série, vencimento, ajuste, margem, base ou custo financeiro." };
}

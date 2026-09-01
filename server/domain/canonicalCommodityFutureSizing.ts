import type { CanonicalHedgeDataframes, SessionInstrumentMasterRow } from "./dataframes";
import { B3_COMMODITY_FUTURE_SPECS } from "./instrumentMaster";
import type { CommodityFutureContract, CommodityExposureUnit, CommodityRoundingPolicy } from "./commodityFuturesSizing";

export type CommodityFutureSizingPublication = {
  alternativeId: string;
  economicSituationId: string;
  contract: CommodityFutureContract;
  exposureQuantity: number;
  exposureUnit: CommodityExposureUnit;
  roundingPolicy: CommodityRoundingPolicy;
  contracts: number;
  coverageRatio: number;
};

/** Persiste somente a equivalência física de unidade homogênea, sem preço ou conversão. */
export function attachCanonicalCommodityFutureSizing(dataframes: CanonicalHedgeDataframes, publication: CommodityFutureSizingPublication, instrumentMasterRows: SessionInstrumentMasterRow[]): CanonicalHedgeDataframes {
  const alternative = dataframes.hedge_alternative_dataframe.find(row => row.alternative_id === publication.alternativeId && row.alternative_kind === "B3_COMMODITY_FUTURE");
  const situation = dataframes.economic_situation_dataframe.find(row => row.economic_situation_id === publication.economicSituationId && row.economic_situation_id === alternative?.economic_situation_id);
  const specification = B3_COMMODITY_FUTURE_SPECS[publication.contract];
  const hasSpecification = instrumentMasterRows.some(row => row.source === "B3_PRODUCT_SPECIFICATION" && row.instrument_key === publication.contract && row.validation_status === "official_specification_loaded");
  if (!alternative || !situation || situation.commodity_reference !== publication.contract || !hasSpecification || publication.exposureUnit !== specification.contractUnit || !Number.isFinite(publication.exposureQuantity) || publication.exposureQuantity <= 0 || !Number.isInteger(publication.contracts) || publication.contracts < 0 || !Number.isFinite(publication.coverageRatio)) return dataframes;
  const rawCoveragePct = publication.coverageRatio * 100;
  const coverageTargetPct = Math.min(rawCoveragePct, 100);
  const limitation = rawCoveragePct > 100
    ? `A política ${publication.roundingPolicy} produziu sobrecobertura física bruta de ${rawCoveragePct.toFixed(6)}%; coverage_target_pct foi limitado a 100% no contrato canônico.`
    : "Dimensionamento por unidade física homogênea, sem conversão, preço, série, vencimento, ajuste, margem, base ou custo financeiro.";
  const replacement = { sizing_id: `sizing::${alternative.alternative_id}`, alternative_id: alternative.alternative_id, economic_situation_id: alternative.economic_situation_id, sizing_status: "sized" as const, coverage_target_pct: coverageTargetPct, hedge_quantity: publication.contracts, hedge_unit: `contrato ${publication.contract}`, required_data: [`quantidade física declarada em ${publication.exposureUnit}`, `especificação oficial B3 de ${publication.contract}`, `política de arredondamento ${publication.roundingPolicy}`], blocking_reason: limitation, method_version: "hedge-sizing-canonical-v1" as const };
  return { ...dataframes, hedge_sizing_dataframe: [replacement, ...dataframes.hedge_sizing_dataframe.filter(row => row.sizing_id !== replacement.sizing_id)] };
}

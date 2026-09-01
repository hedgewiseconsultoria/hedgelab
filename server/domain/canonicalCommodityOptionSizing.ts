import type { CanonicalHedgeDataframes, SessionInstrumentMasterRow } from "./dataframes";
import type { CommodityOptionContract } from "./commodityOptionSizing";
import type { CommodityExposureUnit, CommodityRoundingPolicy } from "./commodityFuturesSizing";

export type CommodityOptionSizingPublication = { alternativeId: string; economicSituationId: string; contract: CommodityOptionContract; exposureQuantity: number; exposureUnit: CommodityExposureUnit; roundingPolicy: CommodityRoundingPolicy; optionPosition: "LONG" | "SHORT"; optionType: "CALL" | "PUT"; contracts: number; coverageRatio: number };

/** Publica somente a equivalência física máxima do ativo-objeto, com série de opção B3 já selecionada. */
export function attachCanonicalCommodityOptionSizing(dataframes: CanonicalHedgeDataframes, publication: CommodityOptionSizingPublication, instrumentMasterRows: SessionInstrumentMasterRow[]): CanonicalHedgeDataframes {
  const alternative = dataframes.hedge_alternative_dataframe.find(row => row.alternative_id === publication.alternativeId && row.alternative_kind === "B3_COMMODITY_OPTION");
  const situation = dataframes.economic_situation_dataframe.find(row => row.economic_situation_id === publication.economicSituationId && row.economic_situation_id === alternative?.economic_situation_id);
  const specificationKey = `${publication.contract}_OPTION` as const;
  const hasSpecification = instrumentMasterRows.some(row => row.source === "B3_PRODUCT_SPECIFICATION" && row.instrument_key === specificationKey && row.product_kind === "B3_COMMODITY_OPTION" && row.validation_status === "official_specification_loaded");
  const selectedObservation = dataframes.b3_observation_link_dataframe?.find(row => row.alternative_id === publication.alternativeId && row.family === publication.contract && row.instrument_type === "OPTION");
  if (!alternative || !situation || situation.commodity_reference !== publication.contract || !hasSpecification || !selectedObservation || !Number.isFinite(publication.exposureQuantity) || publication.exposureQuantity <= 0 || !Number.isInteger(publication.contracts) || publication.contracts < 0 || !Number.isFinite(publication.coverageRatio)) return dataframes;
  const rawCoveragePct = publication.coverageRatio * 100;
  const coverageTargetPct = Math.min(rawCoveragePct, 100);
  const limitation = `Equivalência física máxima de ${publication.optionPosition} ${publication.optionType} sobre o futuro-objeto; sem delta, prêmio, exercício provável, MTM, volatilidade implícita ou Greeks.${rawCoveragePct > 100 ? ` Cobertura bruta de ${rawCoveragePct.toFixed(6)}% limitada a 100% no DataFrame.` : ""}`;
  const replacement = { sizing_id: `sizing::${alternative.alternative_id}`, alternative_id: alternative.alternative_id, economic_situation_id: alternative.economic_situation_id, sizing_status: "sized" as const, coverage_target_pct: coverageTargetPct, hedge_quantity: publication.contracts, hedge_unit: `opção ${publication.contract} (${publication.optionPosition} ${publication.optionType})`, required_data: [`quantidade física declarada em ${publication.exposureUnit}`, `ficha oficial B3 da opção ${publication.contract}`, "série B3 de opção selecionada", `posição ${publication.optionPosition}`, `tipo ${publication.optionType}`, `política de arredondamento ${publication.roundingPolicy}`], blocking_reason: limitation, method_version: "hedge-sizing-canonical-v1" as const };
  return { ...dataframes, hedge_sizing_dataframe: [replacement, ...dataframes.hedge_sizing_dataframe.filter(row => row.sizing_id !== replacement.sizing_id)] };
}

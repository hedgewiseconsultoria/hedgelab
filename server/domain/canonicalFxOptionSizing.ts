import type { CanonicalHedgeDataframes, SessionInstrumentMasterRow } from "./dataframes";
import type { RoundingPolicy } from "./fxFuturesHedge";

export type FxOptionSizingPublication = { exposureId: string; roundingPolicy: RoundingPolicy; optionPosition: "LONG" | "SHORT"; optionType: "CALL" | "PUT"; contracts: number; coverageRatio: number };

/** Publica apenas a referência nocional máxima da opção DOL com ficha e série B3 da própria opção selecionadas. */
export function attachCanonicalFxOptionSizing(dataframes: CanonicalHedgeDataframes, publication: FxOptionSizingPublication, instrumentMasterRows: SessionInstrumentMasterRow[]): CanonicalHedgeDataframes {
  const alternative = dataframes.hedge_alternative_dataframe.find(row => row.exposure_id === publication.exposureId && row.alternative_kind === "B3_DOL_OPTION");
  const situation = alternative ? dataframes.economic_situation_dataframe.find(row => row.economic_situation_id === alternative.economic_situation_id && row.declared_currency === "USD") : undefined;
  const hasSpecification = instrumentMasterRows.some(row => row.source === "B3_PRODUCT_SPECIFICATION" && row.instrument_key === "DOL_OPTION" && row.product_kind === "B3_FX_OPTION" && row.validation_status === "official_specification_loaded");
  const selectedObservation = alternative ? dataframes.b3_observation_link_dataframe?.find(row => row.alternative_id === alternative.alternative_id && row.family === "DOL" && row.instrument_type === "OPTION") : undefined;
  if (!alternative || !situation || !hasSpecification || !selectedObservation || !Number.isInteger(publication.contracts) || publication.contracts < 0 || !Number.isFinite(publication.coverageRatio)) return dataframes;
  const rawCoveragePct = publication.coverageRatio * 100;
  const coverageTargetPct = Math.min(rawCoveragePct, 100);
  const limitation = `Equivalência nocional máxima de ${publication.optionPosition} ${publication.optionType} sobre DOL; sem delta, prêmio, exercício provável, MTM, volatilidade implícita ou Greeks.${rawCoveragePct > 100 ? ` Cobertura bruta de ${rawCoveragePct.toFixed(6)}% limitada a 100% no DataFrame.` : ""}`;
  const replacement = { sizing_id: `sizing::${alternative.alternative_id}`, alternative_id: alternative.alternative_id, economic_situation_id: alternative.economic_situation_id, sizing_status: "sized" as const, coverage_target_pct: coverageTargetPct, hedge_quantity: publication.contracts, hedge_unit: `opção DOL (${publication.optionPosition} ${publication.optionType})`, required_data: ["exposição USD selecionada", "ficha oficial B3 da opção DOL", "série B3 de opção selecionada", `posição ${publication.optionPosition}`, `tipo ${publication.optionType}`, `política de arredondamento ${publication.roundingPolicy}`], blocking_reason: limitation, method_version: "hedge-sizing-canonical-v1" as const };
  return { ...dataframes, hedge_sizing_dataframe: [replacement, ...dataframes.hedge_sizing_dataframe.filter(row => row.sizing_id !== replacement.sizing_id)] };
}

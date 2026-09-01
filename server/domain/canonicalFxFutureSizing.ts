import type { CanonicalHedgeDataframes, SessionInstrumentMasterRow } from "./dataframes";

export type FxFutureSizingPublication = {
  exposureId: string;
  contract: "DOL" | "WDO";
  roundingPolicy: "FLOOR" | "NEAREST" | "CEILING";
  contracts: number;
  coverageRatio: number;
};

/**
 * Promove somente um dimensionamento já calculado com a especificação oficial
 * carregada na sessão. Não seleciona série, vencimento, preço de ajuste ou
 * qualquer premissa de mercado.
 */
export function attachCanonicalFxFutureSizing(
  dataframes: CanonicalHedgeDataframes,
  publication: FxFutureSizingPublication,
  instrumentMasterRows: SessionInstrumentMasterRow[],
): CanonicalHedgeDataframes {
  const alternativeKind = publication.contract === "DOL" ? "B3_DOL_FUTURE" : "B3_WDO_FUTURE";
  const alternative = dataframes.hedge_alternative_dataframe.find(row => row.exposure_id === publication.exposureId && row.alternative_kind === alternativeKind);
  const hasOfficialSpecification = instrumentMasterRows.some(row =>
    row.source === "B3_PRODUCT_SPECIFICATION" && row.instrument_key === publication.contract && row.validation_status === "official_specification_loaded",
  );
  if (!alternative || !hasOfficialSpecification || !Number.isInteger(publication.contracts) || publication.contracts < 0 || !Number.isFinite(publication.coverageRatio)) return dataframes;

  const sizingId = `sizing::${alternative.alternative_id}`;
  const rawCoveragePct = publication.coverageRatio * 100;
  const coverageTargetPct = Math.min(rawCoveragePct, 100);
  const coverageLimitation = rawCoveragePct > 100
    ? `A política de arredondamento ${publication.roundingPolicy} gerou sobrecobertura nocional bruta de ${rawCoveragePct.toFixed(6)}%; o campo coverage_target_pct foi limitado a 100% para atender ao contrato canônico.`
    : "Sem série, vencimento, preço de ajuste, margem ou custo financeiro selecionados; dimensionamento por equivalência de nocional USD.";
  const replacement = {
    sizing_id: sizingId,
    alternative_id: alternative.alternative_id,
    economic_situation_id: alternative.economic_situation_id,
    sizing_status: "sized" as const,
    coverage_target_pct: coverageTargetPct,
    hedge_quantity: publication.contracts,
    hedge_unit: `contrato ${publication.contract}`,
    required_data: [
      "exposição USD selecionada",
      `especificação oficial B3 de ${publication.contract}`,
      `política de arredondamento ${publication.roundingPolicy}`,
    ],
    blocking_reason: coverageLimitation,
    method_version: "hedge-sizing-canonical-v1" as const,
  };
  return { ...dataframes, hedge_sizing_dataframe: [replacement, ...dataframes.hedge_sizing_dataframe.filter(row => row.sizing_id !== sizingId)] };
}

import type { B3MarketObservationRow, CanonicalB3ObservationLinkRow, CanonicalHedgeAlternativeRow, CanonicalHedgeDataframes, CanonicalEconomicSituationRow, SupportedB3Family } from "./dataframes";

export type B3ObservationCompatibility = { families: readonly SupportedB3Family[]; instrumentTypes: readonly B3MarketObservationRow["instrumentType"][] };

/** Catálogo explícito: não há compatibilidade implícita por prefixo de ticker. */
export function getB3ObservationCompatibility(alternative: CanonicalHedgeAlternativeRow, situation: CanonicalEconomicSituationRow | undefined): B3ObservationCompatibility | null {
  switch (alternative.alternative_kind) {
    case "B3_DOL_FUTURE": return { families: ["DOL"], instrumentTypes: ["FUTURE"] };
    case "B3_WDO_FUTURE": return { families: ["WDO"], instrumentTypes: ["FUTURE"] };
    case "B3_DOL_OPTION": return { families: ["DOL"], instrumentTypes: ["OPTION"] };
    case "B3_DI1_FUTURE": return { families: ["DI1"], instrumentTypes: ["FUTURE"] };
    case "B3_FRA_DI1": return { families: ["DI1"], instrumentTypes: ["FUTURE"] };
    case "B3_DI1_OPTION": return { families: ["DI1"], instrumentTypes: ["OPTION", "FUTURE"] };
    case "B3_COMMODITY_FUTURE": return situation?.commodity_reference ? { families: [situation.commodity_reference], instrumentTypes: ["FUTURE"] } : null;
    case "B3_COMMODITY_OPTION": return situation?.commodity_reference ? { families: [situation.commodity_reference], instrumentTypes: ["OPTION"] } : null;
    default: return null;
  }
}

export type B3ObservationSelectionPublication = {
  alternativeId: string;
  candidate: B3MarketObservationRow;
  priceSource: {
    reportType: "BVBG.086.01" | "BVBG.187.01";
    sourceUrl: string;
    sourceFile: string;
    sourceAsOf: string;
    sourceHashSha256: string;
    normalizedCsvStorageKey: string | null;
    normalizedCsvSha256: string | null;
    normalizedManifestStorageKey: string | null;
  };
  instrumentSource: {
    sourceUrl: string;
    sourceFile: string;
    sourceAsOf: string;
    sourceHashSha256: string;
    normalizedCsvStorageKey: string | null;
    normalizedCsvSha256: string | null;
    normalizedManifestStorageKey: string | null;
  };
  selectedAtUtc: string;
};

/**
 * Mantém a seleção como vínculo de evidência, não como precificação. A função
 * rejeita a publicação silenciosamente pelo retorno inalterado quando a
 * alternativa ou a evidência não forem elegíveis para associação.
 */
export function attachCanonicalB3ObservationLink(dataframes: CanonicalHedgeDataframes, publication: B3ObservationSelectionPublication): CanonicalHedgeDataframes {
  const alternative = dataframes.hedge_alternative_dataframe.find(row => row.alternative_id === publication.alternativeId);
  const situation = alternative ? dataframes.economic_situation_dataframe.find(row => row.economic_situation_id === alternative.economic_situation_id) : undefined;
  const candidate = publication.candidate;
  if (!alternative || !alternative.source_ids.includes("B3_PUBLIC_FILES") || !candidate.symbol || !candidate.instrumentId || !candidate.family) return dataframes;
  const compatibility = getB3ObservationCompatibility(alternative, situation);
  if (!compatibility || !compatibility.families.includes(candidate.family) || !compatibility.instrumentTypes.includes(candidate.instrumentType)) return dataframes;
  if (candidate.tradeDate !== publication.priceSource.sourceAsOf || candidate.instrumentReportAsOf !== publication.instrumentSource.sourceAsOf) return dataframes;
  if (publication.priceSource.sourceAsOf !== publication.instrumentSource.sourceAsOf) return dataframes;
  const row: CanonicalB3ObservationLinkRow = {
    observation_link_id: `b3-observation::${alternative.alternative_id}::${candidate.instrumentId}::${publication.priceSource.sourceAsOf}`,
    alternative_id: alternative.alternative_id,
    family: candidate.family,
    symbol: candidate.symbol,
    instrument_id: candidate.instrumentId,
    instrument_type: candidate.instrumentType,
    maturity: candidate.maturity,
    option_type: candidate.optionType,
    exercise_price: candidate.exercisePrice,
    observed_prices: { last_price: candidate.lastPrice, trade_average_price: candidate.tradeAveragePrice, adjusted_quote: candidate.adjustedQuote, adjusted_quote_tax: candidate.adjustedQuoteTax },
    price_source: { report_type: publication.priceSource.reportType, source_url: publication.priceSource.sourceUrl, source_file: publication.priceSource.sourceFile, source_asof: publication.priceSource.sourceAsOf, source_hash_sha256: publication.priceSource.sourceHashSha256, normalized_csv_storage_key: publication.priceSource.normalizedCsvStorageKey, normalized_csv_sha256: publication.priceSource.normalizedCsvSha256, normalized_manifest_storage_key: publication.priceSource.normalizedManifestStorageKey },
    instrument_source: { source_url: publication.instrumentSource.sourceUrl, source_file: publication.instrumentSource.sourceFile, source_asof: publication.instrumentSource.sourceAsOf, source_hash_sha256: publication.instrumentSource.sourceHashSha256, normalized_csv_storage_key: publication.instrumentSource.normalizedCsvStorageKey, normalized_csv_sha256: publication.instrumentSource.normalizedCsvSha256, normalized_manifest_storage_key: publication.instrumentSource.normalizedManifestStorageKey },
    association_status: "valid_same_asof",
    selected_at_utc: publication.selectedAtUtc,
    method_version: "b3-observation-selection-v1",
  };
  const current = dataframes.b3_observation_link_dataframe ?? [];
  const preservesSeparateFutureLegs = alternative.alternative_kind === "B3_FRA_DI1";
  return { ...dataframes, b3_observation_link_dataframe: [row, ...current.filter(item => item.alternative_id !== row.alternative_id || (preservesSeparateFutureLegs ? item.instrument_id !== row.instrument_id : item.instrument_type !== row.instrument_type))] };
}

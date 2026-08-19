export const SUPPORTED_B3_FAMILIES = [
  "DI1",
  "DOL",
  "WDO",
  "DDI",
  "BGI",
  "CCM",
  "SOY",
  "ICF",
  "ETH",
  "CNL",
  "SJC",
] as const;

export type SupportedB3Family = (typeof SUPPORTED_B3_FAMILIES)[number];

export type DataLineage = {
  sourceId: "B3_PUBLIC_FILES" | "BCB_PTAX" | "BCB_SGS_11_SELIC" | "BCB_SGS_1178_SELIC_AA252" | "ANBIMA_ETTJ" | "IBGE_IPCA" | "FGV_IGPM";
  sourceUrl: string;
  sourceFile: string;
  extractedAtUtc: string;
  sourceAsOf: string | null;
  sourceHashSha256: string | null;
  parserVersion: string;
  validationStatus: "valid" | "invalid" | "warning";
};

export type DatasetIssue = {
  code:
    | "DUPLICATE_INSTRUMENT_ID"
    | "MISSING_INSTRUMENT_ID"
    | "MISSING_SYMBOL"
    | "MISSING_MATURITY"
    | "OPTION_UNDERLYING_MISSING"
    | "UNKNOWN_INSTRUMENT_TYPE";
  severity: "error" | "warning";
  instrumentId: string | null;
  message: string;
};

export type B3InstrumentType = "FUTURE" | "OPTION" | "OTHER";

/**
 * Linha normalizada de instrumento extraída do BVBG.028.02. A estrutura usa
 * apenas campos observados no arquivo ou valores nulos explícitos; não calcula
 * tamanho de contrato, tick ou liquidação a partir de suposições.
 */
export type B3InstrumentRow = {
  instrumentId: string;
  symbol: string | null;
  isin: string | null;
  family: SupportedB3Family;
  assetDescription: string | null;
  description: string | null;
  instrumentType: B3InstrumentType;
  underlyingInstrumentId: string | null;
  maturity: string | null;
  currency: string | null;
  contractMultiplier: number | null;
  assetQuotationQuantity: number | null;
  allocationRoundLot: number | null;
  exercisePrice: number | null;
  optionType: "CALL" | "PUT" | null;
  exerciseStyle: string | null;
  active: boolean | null;
  reportDate: string | null;
  rawSchema: "bvmf.100.02";
};

/**
 * Forma serializável do Instrument Master. `contractSize` e `tickSize` são
 * deliberadamente nulos nesta etapa, pois o BVBG.028.02 observado não fornece
 * uma definição sem ambiguidade para esses atributos econômicos.
 */
export type InstrumentMasterRow = {
  instrument_id: string;
  symbol: string | null;
  isin: string | null;
  family: SupportedB3Family;
  asset_class: "derivatives";
  instrument_type: B3InstrumentType;
  underlying_id: string | null;
  underlying_symbol: null;
  maturity: string | null;
  currency: string | null;
  contract_size: null;
  tick_size: null;
  settlement_type: null;
  status: "active" | "inactive" | "unknown";
  source: "B3_PUBLIC_FILES";
  source_file: string;
  asof: string | null;
  source_contract_multiplier: number | null;
  source_asset_quotation_quantity: number | null;
  option_type?: "CALL" | "PUT" | null;
  exercise_price?: number | null;
  exercise_style?: string | null;
  contract_size_status: "not_inferred_from_bvbg_028_02";
};

/**
 * Instrumento bilateral confirmado pelo arquivo contratual do usuário. Este
 * registro não reutiliza campos do BVBG.028.02 e não supõe especificações B3.
 */
export type OtcInstrumentMasterRow = {
  instrument_id: string;
  kind: "OTC_NDF" | "OTC_FX_SWAP" | "OTC_RATE_SWAP";
  base_currency: "USD" | "BRL";
  quote_currency: "USD" | "BRL";
  notional_base_currency: number;
  trade_date: string;
  maturity: string;
  settlement_convention: string;
  terms: Record<string, unknown>;
  source: "USER_CONTRACT";
  evidence_source_file: string;
  evidence_source_url: string | null;
  evidence_sha256: string;
  evidence_captured_at_utc: string;
  validation_status: "validated_user_contract";
};

/** Especificação oficial do produto B3; não identifica uma série contratual. */
export type B3ProductSpecificationSessionRow = {
  instrument_id: string;
  instrument_key: "DOL" | "WDO" | "DOL_OPTION" | "DI1" | "DI1_OPTION" | "BGI" | "CCM" | "SOY" | "SJC" | "BGI_OPTION" | "CCM_OPTION" | "SOY_OPTION" | "SJC_OPTION";
  product_kind: "B3_FX_FUTURE" | "B3_FX_OPTION" | "B3_DI_FUTURE" | "B3_DI_OPTION" | "B3_COMMODITY_FUTURE" | "B3_COMMODITY_OPTION";
  description: string;
  terms: Record<string, unknown>;
  source: "B3_PRODUCT_SPECIFICATION";
  evidence_source_file: string;
  evidence_source_url: string;
  evidence_sha256: string;
  evidence_captured_at_utc: string;
  validation_status: "official_specification_loaded";
  series_status: "no_b3_series_selected";
};

export type SessionInstrumentMasterRow = InstrumentMasterRow | OtcInstrumentMasterRow | B3ProductSpecificationSessionRow;

export type InstrumentDataset = {
  dataframe: B3InstrumentRow[];
  instrumentMasterDataframe: InstrumentMasterRow[];
  coverage: Array<{
    family: SupportedB3Family;
    records: number;
    firstMaturity: string | null;
    lastMaturity: string | null;
  }>;
  lineage: DataLineage;
  issues: DatasetIssue[];
};

export type B3PriceReportType = "BVBG.086.01" | "BVBG.187.01";

/**
 * Linha normalizada de `PricRpt` extraída de um arquivo real B3. Os campos
 * opcionais preservam `null` quando o layout ou o registro não os envia.
 */
export type B3PriceRow = {
  tradeDate: string;
  symbol: string;
  instrumentId: string;
  marketIdentifierCode: string;
  reportType: B3PriceReportType;
  sourceMessageType: string | null;
  tradeQuantity: number | null;
  marketDataStreamId: string | null;
  nationalFinancialVolume: number | null;
  nationalFinancialVolumeCurrency: string | null;
  internationalFinancialVolume: number | null;
  internationalFinancialVolumeCurrency: string | null;
  openInterest: number | null;
  financialInstrumentQuantity: number | null;
  bestBidPrice: number | null;
  bestBidPriceCurrency: string | null;
  bestAskPrice: number | null;
  bestAskPriceCurrency: string | null;
  firstPrice: number | null;
  firstPriceCurrency: string | null;
  minimumPrice: number | null;
  minimumPriceCurrency: string | null;
  maximumPrice: number | null;
  maximumPriceCurrency: string | null;
  tradeAveragePrice: number | null;
  tradeAveragePriceCurrency: string | null;
  lastPrice: number | null;
  lastPriceCurrency: string | null;
  regularTransactionsQuantity: number | null;
  nonRegularTransactionsQuantity: number | null;
  regularTradedContracts: number | null;
  nonRegularTradedContracts: number | null;
  nationalRegularVolume: number | null;
  nationalRegularVolumeCurrency: string | null;
  nationalNonRegularVolume: number | null;
  nationalNonRegularVolumeCurrency: string | null;
  internationalRegularVolume: number | null;
  internationalRegularVolumeCurrency: string | null;
  internationalNonRegularVolume: number | null;
  internationalNonRegularVolumeCurrency: string | null;
  adjustedQuote: number | null;
  adjustedQuoteCurrency: string | null;
  adjustedQuoteTax: number | null;
  adjustedQuoteTaxCurrency: string | null;
  adjustedQuoteSituation: string | null;
  previousAdjustedQuote: number | null;
  previousAdjustedQuoteCurrency: string | null;
  previousAdjustedQuoteTax: number | null;
  previousAdjustedQuoteTaxCurrency: string | null;
  previousAdjustedQuoteSituation: string | null;
  oscillationPercentage: number | null;
  variationPoints: number | null;
  variationPointsCurrency: string | null;
  equivalentValue: number | null;
  equivalentValueCurrency: string | null;
  adjustedValueContract: number | null;
  adjustedValueContractCurrency: string | null;
  maximumTradeLimit: number | null;
  maximumTradeLimitCurrency: string | null;
  minimumTradeLimit: number | null;
  minimumTradeLimitCurrency: string | null;
  daysToSettlement: string | null;
  sourceFile: string;
  sourceHashSha256: string | null;
};

export type B3PriceDatasetIssue = {
  code: "MISSING_TRADE_DATE" | "MISSING_SYMBOL" | "MISSING_INSTRUMENT_ID" | "MISSING_MARKET_IDENTIFIER" | "PRICE_REPORT_TYPE_MISMATCH" | "UNEXPECTED_MESSAGE_TYPE";
  severity: "error" | "warning";
  symbol: string | null;
  message: string;
};

export type B3PriceDataset = {
  dataframe: B3PriceRow[];
  lineage: DataLineage;
  observedFields: string[];
  issues: B3PriceDatasetIssue[];
  header: {
    reportType: string | null;
    messageType: string | null;
    totalMessages: number | null;
    createdAt: string | null;
  };
};

export type B3MarketObservationRow = B3PriceRow & {
  family: SupportedB3Family;
  instrumentType: B3InstrumentType;
  maturity: string | null;
  optionType: "CALL" | "PUT" | null;
  exercisePrice: number | null;
  underlyingInstrumentId: string | null;
  instrumentReportAsOf: string | null;
};

export type B3MarketValidationIssue = {
  code: "PRICE_INSTRUMENT_NOT_IN_MASTER" | "PRICE_INSTRUMENT_ASOF_MISMATCH" | "MISSING_MATURITY_FOR_DERIVATIVE" | "OPTION_WITHOUT_UNDERLYING" | "FAMILY_WITHOUT_PRICE_RECORD";
  severity: "error" | "warning";
  instrumentId: string | null;
  family: SupportedB3Family | null;
  message: string;
};

export type B3MarketDataset = {
  dataframe: B3MarketObservationRow[];
  associationStatus: "valid" | "blocked_asof_mismatch";
  coverage: Array<{
    family: SupportedB3Family;
    records: number;
    futureRecords: number;
    optionRecords: number;
    recordsWithTradePrice: number;
    recordsWithAdjustedQuote: number;
  }>;
  issues: B3MarketValidationIssue[];
};

/**
 * Situação econômica declarada pelo usuário antes de qualquer seleção de
 * derivativo. É propositalmente independente do fornecedor de market data.
 */
export type EconomicExposureDataframeRow = {
  exposure_id: string;
  exposure_kind: "USD_PAYABLE" | "USD_RECEIVABLE" | "CDI_LINKED_DEBT" | "COMMODITY_PURCHASE" | "COMMODITY_SALE";
  description: string;
  notional: number;
  currency: "USD" | "BRL";
  maturity_date: string;
  commodity_reference: "BGI" | "CCM" | "SOY" | "SJC" | null;
  indexer: "CDI" | null;
  interest_spread_pct_aa: number | null;
  declared_at_utc: string;
};

/** Diagnóstico econômico sem recomendação, produto ou preço presumidos. */
export type HedgeDiagnosisDataframeRow = {
  exposure_id: string;
  risk_factor: "USD_BRL" | "CDI_RATE" | "B3_COMMODITY_PRICE";
  adverse_move: string;
  economic_impact: string;
  hedge_direction: "BUY" | "SELL";
  method_version: "economic-exposure-diagnosis-v1";
};

/**
 * Alternativa gerada pelo catálogo. O status bloqueia a precificação quando
 * faltam série B3, dados observáveis ou termos de contrato bilateral.
 */
export type HedgeAlternativeDataframeRow = {
  alternative_id: string;
  exposure_id: string;
  alternative_kind: "B3_DOL_FUTURE" | "B3_WDO_FUTURE" | "B3_DOL_OPTION" | "OTC_NDF_OR_TERM" | "OTC_FX_SWAP" | "B3_DI1_FUTURE" | "B3_FRA_DI1" | "B3_DI1_OPTION" | "OTC_RATE_SWAP" | "B3_COMMODITY_FUTURE" | "B3_COMMODITY_OPTION";
  label: string;
  risk_factor: HedgeDiagnosisDataframeRow["risk_factor"];
  hedge_direction: "BUY" | "SELL";
  eligibility_status: "eligible_with_market_data" | "contract_required" | "blocked";
  required_data: string[];
  blocking_reason: string | null;
  source_ids: Array<"B3_PUBLIC_FILES" | "B3_PRODUCT_SPECIFICATION" | "USER_CONTRACT" | "BCB_PTAX">;
  method_version: "hedge-alternatives-v1";
};

/** Camada canônica da situação econômica, separada de exposições financeiras e de qualquer fornecedor de mercado. */
export type CanonicalEconomicSituationRow = {
  economic_situation_id: string;
  exposure_id: string;
  situation_kind: EconomicExposureDataframeRow["exposure_kind"];
  description: string;
  declared_quantity: number;
  declared_currency: "USD" | "BRL";
  horizon_date: string;
  commodity_reference: EconomicExposureDataframeRow["commodity_reference"];
  indexer: EconomicExposureDataframeRow["indexer"];
  origin: "USER_DECLARED";
  captured_at_utc: string;
};

export type CanonicalRiskFactorRow = {
  risk_factor_id: string;
  economic_situation_id: string;
  risk_factor: HedgeDiagnosisDataframeRow["risk_factor"];
  adverse_move: string;
  economic_impact: string;
  hedge_direction: "BUY" | "SELL";
  method_version: "economic-exposure-diagnosis-v1";
};

export type CanonicalHedgeAlternativeRow = HedgeAlternativeDataframeRow & {
  economic_situation_id: string;
  risk_factor_id: string;
  origin: "CATALOG_DERIVED";
};

/** Dimensionamento só recebe quantidade quando contrato, unidade e dados necessários estão oficialmente validados. */
export type CanonicalHedgeSizingRow = {
  sizing_id: string;
  alternative_id: string;
  economic_situation_id: string;
  sizing_status: "pending_required_data" | "blocked" | "sized";
  coverage_target_pct: number | null;
  hedge_quantity: number | null;
  hedge_unit: string | null;
  required_data: string[];
  blocking_reason: string | null;
  method_version: "hedge-sizing-canonical-v1";
};

/** Resultado econômico de cenário; permanece vazio até existir um motor com insumos oficialmente validados. */
export type CanonicalScenarioResultRow = {
  scenario_result_id: string;
  scenario_id: string;
  alternative_id: string | null;
  calculation_id: string | null;
  result_status: "SUCCESS" | "BLOCKED" | "WARNING";
  economic_result: number | null;
  result_currency: string | null;
  limitation: string | null;
  generated_at_utc: string;
};

/**
 * Vínculo escolhido explicitamente pelo usuário entre uma alternativa e uma
 * observação obtida de PriceReport + InstrumentReport na mesma data-base. Não
 * é uma recomendação, não completa atributos ausentes e não implica que a
 * série esteja aprovada para precificação ou dimensionamento.
 */
export type CanonicalB3ObservationLinkRow = {
  observation_link_id: string;
  alternative_id: string;
  family: SupportedB3Family;
  symbol: string;
  instrument_id: string;
  instrument_type: B3InstrumentType;
  maturity: string | null;
  option_type: "CALL" | "PUT" | null;
  exercise_price: number | null;
  observed_prices: {
    last_price: number | null;
    trade_average_price: number | null;
    adjusted_quote: number | null;
    adjusted_quote_tax: number | null;
  };
  price_source: {
    report_type: B3PriceReportType;
    source_url: string;
    source_file: string;
    source_asof: string;
    source_hash_sha256: string;
    normalized_csv_storage_key: string;
    normalized_csv_sha256: string;
    normalized_manifest_storage_key: string;
  };
  instrument_source: {
    source_url: string;
    source_file: string;
    source_asof: string;
    source_hash_sha256: string;
    normalized_csv_storage_key: string;
    normalized_csv_sha256: string;
    normalized_manifest_storage_key: string;
  };
  association_status: "valid_same_asof";
  selected_at_utc: string;
  method_version: "b3-observation-selection-v1";
};

export type CanonicalHedgeDataframes = {
  economic_situation_dataframe: CanonicalEconomicSituationRow[];
  risk_factor_dataframe: CanonicalRiskFactorRow[];
  hedge_alternative_dataframe: CanonicalHedgeAlternativeRow[];
  hedge_sizing_dataframe: CanonicalHedgeSizingRow[];
  scenario_result_dataframe: CanonicalScenarioResultRow[];
  b3_observation_link_dataframe?: CanonicalB3ObservationLinkRow[];
};

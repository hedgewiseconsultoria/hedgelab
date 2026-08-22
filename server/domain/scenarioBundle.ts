import { createHash } from "node:crypto";
import { z } from "zod";
import { SUPPORTED_B3_FAMILIES, type DataLineage, type SessionInstrumentMasterRow, type CanonicalEconomicSituationRow, type CanonicalRiskFactorRow, type CanonicalHedgeAlternativeRow, type CanonicalHedgeSizingRow, type CanonicalScenarioResultRow, type CanonicalB3ObservationLinkRow } from "./dataframes";

export const HEDGE_LAB_BUNDLE_SCHEMA_VERSION = "1.0.0" as const;

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve seguir AAAA-MM-DD.");
const isoInstantSchema = z.string().datetime({ offset: true });

export const instrumentMasterRowSchema = z.object({
  instrument_id: z.string().min(1),
  symbol: z.string().min(1).nullable(),
  isin: z.string().min(1).nullable(),
  family: z.enum(SUPPORTED_B3_FAMILIES),
  asset_class: z.literal("derivatives"),
  instrument_type: z.enum(["FUTURE", "OPTION", "OTHER"]),
  underlying_id: z.string().min(1).nullable(),
  underlying_symbol: z.null(),
  maturity: isoDateSchema.nullable(),
  currency: z.string().regex(/^[A-Z]{3}$/).nullable(),
  contract_size: z.null(),
  tick_size: z.null(),
  settlement_type: z.null(),
  status: z.enum(["active", "inactive", "unknown"]),
  source: z.literal("B3_PUBLIC_FILES"),
  source_file: z.string().min(1),
  asof: isoDateSchema.nullable(),
  source_contract_multiplier: z.number().finite().nullable(),
  source_asset_quotation_quantity: z.number().finite().nullable(),
  contract_size_status: z.literal("not_inferred_from_bvbg_028_02"),
});

export const otcInstrumentMasterRowSchema = z.object({
  instrument_id: z.string().min(1),
  kind: z.enum(["OTC_NDF", "OTC_FX_SWAP", "OTC_RATE_SWAP"]),
  base_currency: z.enum(["USD", "BRL"]),
  quote_currency: z.enum(["USD", "BRL"]),
  notional_base_currency: z.number().finite().positive(),
  trade_date: isoDateSchema,
  maturity: isoDateSchema,
  settlement_convention: z.string().min(1),
  terms: z.record(z.string(), z.unknown()),
  source: z.literal("USER_CONTRACT"),
  evidence_source_file: z.string().min(1),
  evidence_source_url: z.string().url().nullable(),
  evidence_sha256: z.string().regex(/^[a-f0-9]{64}$/i, "Hash contratual deve ser SHA-256."),
  evidence_captured_at_utc: isoInstantSchema,
  validation_status: z.literal("validated_user_contract"),
});

export const b3ProductSpecificationSessionRowSchema = z.object({
  instrument_id: z.string().regex(/^B3_PRODUCT_SPEC::(DOL|WDO|DOL_OPTION|DI1|DI1_OPTION|BGI|ICF|CNL|ETH|CCM|GLD|SOY|SJC|BGI_OPTION|CCM_OPTION|SOY_OPTION|SJC_OPTION)$/),
  instrument_key: z.enum(["DOL", "WDO", "DOL_OPTION", "DI1", "DI1_OPTION", "BGI", "ICF", "CNL", "ETH", "CCM", "GLD", "SOY", "SJC", "BGI_OPTION", "CCM_OPTION", "SOY_OPTION", "SJC_OPTION"]),
  product_kind: z.enum(["B3_FX_FUTURE", "B3_FX_OPTION", "B3_DI_FUTURE", "B3_DI_OPTION", "B3_COMMODITY_FUTURE", "B3_COMMODITY_OPTION"]),
  description: z.string().min(1),
  terms: z.record(z.string(), z.unknown()),
  source: z.literal("B3_PRODUCT_SPECIFICATION"),
  evidence_source_file: z.string().min(1),
  evidence_source_url: z.string().url(),
  evidence_sha256: z.string().regex(/^[a-f0-9]{64}$/i),
  evidence_captured_at_utc: isoInstantSchema,
  validation_status: z.literal("official_specification_loaded"),
  series_status: z.literal("no_b3_series_selected"),
});

export const exposureRowSchema = z.object({
  exposure_id: z.string().min(1),
  description: z.string().min(1),
  currency: z.string().regex(/^[A-Z]{3}$/, "Moeda deve ter três letras maiúsculas."),
  direction: z.enum(["RECEIVABLE", "PAYABLE"]),
  notional: z.number().finite().positive(),
  cashflow_date: isoDateSchema,
  created_at_utc: isoInstantSchema,
});

export const hedgeRowSchema = z.object({
  hedge_id: z.string().min(1),
  exposure_id: z.string().min(1),
  instrument_id: z.string().min(1),
  strategy: z.string().min(1),
  quantity: z.number().finite(),
  trade_date: isoDateSchema,
  maturity: isoDateSchema.nullable(),
  method_version: z.string().min(1),
});

export const scenarioRowSchema = z.object({
  scenario_id: z.string().min(1),
  scenario_name: z.string().min(1),
  fx_shock_pct: z.number().finite().nullable(),
  rate_shock_bps: z.number().finite().nullable(),
  volatility_shock_pct: z.number().finite().nullable(),
  created_at_utc: isoInstantSchema,
});

export const calculationRowSchema = z.object({
  calculation_id: z.string().min(1),
  scenario_id: z.string().min(1),
  method: z.string().min(1),
  formula_version: z.string().min(1),
  calculation_status: z.enum(["SUCCESS", "BLOCKED", "WARNING"]),
  result: z.record(z.string(), z.unknown()),
  warnings: z.array(z.string()),
  calculated_at_utc: isoInstantSchema,
});

export const lineageRowSchema = z.object({
  source_id: z.string().min(1),
  source_url: z.string().url(),
  source_file: z.string().min(1),
  extracted_at_utc: isoInstantSchema,
  source_asof: isoDateSchema.nullable(),
  source_hash_sha256: z.string().nullable(),
  parser_version: z.string().min(1),
  validation_status: z.enum(["valid", "invalid", "warning"]),
});

export const canonicalEconomicSituationRowSchema = z.object({
  economic_situation_id: z.string().min(1), exposure_id: z.string().min(1), situation_kind: z.enum(["USD_PAYABLE", "USD_RECEIVABLE", "CDI_LINKED_DEBT", "COMMODITY_PURCHASE", "COMMODITY_SALE"]), description: z.string().min(1), declared_quantity: z.number().finite().positive(), declared_currency: z.enum(["USD", "BRL"]), horizon_date: isoDateSchema, commodity_reference: z.enum(["BGI", "ICF", "CNL", "ETH", "CCM", "GLD", "SOY", "SJC"]).nullable(), indexer: z.literal("CDI").nullable(), origin: z.literal("USER_DECLARED"), captured_at_utc: isoInstantSchema,
});
export const canonicalRiskFactorRowSchema = z.object({
  risk_factor_id: z.string().min(1), economic_situation_id: z.string().min(1), risk_factor: z.enum(["USD_BRL", "CDI_RATE", "B3_COMMODITY_PRICE"]), adverse_move: z.string().min(1), economic_impact: z.string().min(1), hedge_direction: z.enum(["BUY", "SELL"]), method_version: z.literal("economic-exposure-diagnosis-v1"),
});
export const canonicalHedgeAlternativeRowSchema = z.object({
  alternative_id: z.string().min(1), exposure_id: z.string().min(1), alternative_kind: z.enum(["B3_DOL_FUTURE", "B3_WDO_FUTURE", "B3_DOL_OPTION", "OTC_NDF_OR_TERM", "OTC_FX_SWAP", "B3_DI1_FUTURE", "B3_FRA_DI1", "B3_DI1_OPTION", "OTC_RATE_SWAP", "B3_COMMODITY_FUTURE", "B3_COMMODITY_OPTION"]), label: z.string().min(1), risk_factor: z.enum(["USD_BRL", "CDI_RATE", "B3_COMMODITY_PRICE"]), hedge_direction: z.enum(["BUY", "SELL"]), eligibility_status: z.enum(["eligible_with_market_data", "contract_required", "blocked"]), required_data: z.array(z.string().min(1)), blocking_reason: z.string().nullable(), source_ids: z.array(z.enum(["B3_PUBLIC_FILES", "B3_PRODUCT_SPECIFICATION", "USER_CONTRACT", "BCB_PTAX"])), method_version: z.literal("hedge-alternatives-v1"), economic_situation_id: z.string().min(1), risk_factor_id: z.string().min(1), origin: z.literal("CATALOG_DERIVED"),
});
export const canonicalHedgeSizingRowSchema = z.object({
  sizing_id: z.string().min(1), alternative_id: z.string().min(1), economic_situation_id: z.string().min(1), sizing_status: z.enum(["pending_required_data", "blocked", "sized"]), coverage_target_pct: z.number().finite().min(0).max(100).nullable(), hedge_quantity: z.number().finite().nullable(), hedge_unit: z.string().min(1).nullable(), required_data: z.array(z.string().min(1)), blocking_reason: z.string().nullable(), method_version: z.literal("hedge-sizing-canonical-v1"),
});
export const canonicalScenarioResultRowSchema = z.object({
  scenario_result_id: z.string().min(1), scenario_id: z.string().min(1), alternative_id: z.string().min(1).nullable(), calculation_id: z.string().min(1).nullable(), result_status: z.enum(["SUCCESS", "BLOCKED", "WARNING"]), economic_result: z.number().finite().nullable(), result_currency: z.string().min(1).nullable(), limitation: z.string().min(1).nullable(), generated_at_utc: isoInstantSchema,
});
export const canonicalB3ObservationLinkRowSchema = z.object({
  observation_link_id: z.string().min(1), alternative_id: z.string().min(1), family: z.enum(SUPPORTED_B3_FAMILIES), symbol: z.string().min(1), instrument_id: z.string().min(1), instrument_type: z.enum(["FUTURE", "OPTION", "OTHER"]), maturity: isoDateSchema.nullable(), option_type: z.enum(["CALL", "PUT"]).nullable(), exercise_price: z.number().finite().nullable(),
  observed_prices: z.object({ last_price: z.number().finite().nullable(), trade_average_price: z.number().finite().nullable(), adjusted_quote: z.number().finite().nullable(), adjusted_quote_tax: z.number().finite().nullable() }),
  price_source: z.object({ report_type: z.enum(["BVBG.086.01", "BVBG.187.01"]), source_url: z.string().url(), source_file: z.string().min(1), source_asof: isoDateSchema, source_hash_sha256: z.string().regex(/^[a-f0-9]{64}$/i), normalized_csv_storage_key: z.string().min(1), normalized_csv_sha256: z.string().regex(/^[a-f0-9]{64}$/i), normalized_manifest_storage_key: z.string().min(1) }),
  instrument_source: z.object({ source_url: z.string().url(), source_file: z.string().min(1), source_asof: isoDateSchema, source_hash_sha256: z.string().regex(/^[a-f0-9]{64}$/i), normalized_csv_storage_key: z.string().min(1), normalized_csv_sha256: z.string().regex(/^[a-f0-9]{64}$/i), normalized_manifest_storage_key: z.string().min(1) }),
  association_status: z.literal("valid_same_asof"), selected_at_utc: isoInstantSchema, method_version: z.literal("b3-observation-selection-v1"),
});

export type ExposureRow = z.infer<typeof exposureRowSchema>;
export type HedgeRow = z.infer<typeof hedgeRowSchema>;
export type ScenarioRow = z.infer<typeof scenarioRowSchema>;
export type CalculationRow = z.infer<typeof calculationRowSchema>;
export type LineageRow = z.infer<typeof lineageRowSchema>;

export type HedgeLabDataFrames = {
  instrument_master_dataframe: SessionInstrumentMasterRow[];
  exposure_dataframe: ExposureRow[];
  hedge_dataframe: HedgeRow[];
  scenario_dataframe: ScenarioRow[];
  calculation_dataframe: CalculationRow[];
  lineage_dataframe: LineageRow[];
  economic_situation_dataframe?: CanonicalEconomicSituationRow[];
  risk_factor_dataframe?: CanonicalRiskFactorRow[];
  hedge_alternative_dataframe?: CanonicalHedgeAlternativeRow[];
  hedge_sizing_dataframe?: CanonicalHedgeSizingRow[];
  scenario_result_dataframe?: CanonicalScenarioResultRow[];
  b3_observation_link_dataframe?: CanonicalB3ObservationLinkRow[];
};

export type HedgeLabScenarioBundle = {
  bundle_schema_version: typeof HEDGE_LAB_BUNDLE_SCHEMA_VERSION;
  bundle_id: string;
  exported_at_utc: string;
  bundle_sha256: string;
  dataframes: HedgeLabDataFrames;
};

export const scenarioBundleInputSchema = z.object({
  bundle_schema_version: z.literal(HEDGE_LAB_BUNDLE_SCHEMA_VERSION),
  bundle_id: z.string().min(1),
  exported_at_utc: isoInstantSchema,
  dataframes: z.object({
    instrument_master_dataframe: z.array(z.union([instrumentMasterRowSchema, otcInstrumentMasterRowSchema, b3ProductSpecificationSessionRowSchema])),
    exposure_dataframe: z.array(exposureRowSchema),
    hedge_dataframe: z.array(hedgeRowSchema),
    scenario_dataframe: z.array(scenarioRowSchema),
    calculation_dataframe: z.array(calculationRowSchema),
    lineage_dataframe: z.array(lineageRowSchema),
    economic_situation_dataframe: z.array(canonicalEconomicSituationRowSchema).optional(),
    risk_factor_dataframe: z.array(canonicalRiskFactorRowSchema).optional(),
    hedge_alternative_dataframe: z.array(canonicalHedgeAlternativeRowSchema).optional(),
    hedge_sizing_dataframe: z.array(canonicalHedgeSizingRowSchema).optional(),
    scenario_result_dataframe: z.array(canonicalScenarioResultRowSchema).optional(),
    b3_observation_link_dataframe: z.array(canonicalB3ObservationLinkRowSchema).optional(),
  }),
});

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }
  return value;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function validateRelationships(dataframes: HedgeLabDataFrames): string[] {
  const errors: string[] = [];
  const exposureIds = new Set(dataframes.exposure_dataframe.map(row => row.exposure_id));
  const instrumentIds = new Set(dataframes.instrument_master_dataframe.map(row => row.instrument_id));
  const scenarioIds = new Set(dataframes.scenario_dataframe.map(row => row.scenario_id));

  for (const hedge of dataframes.hedge_dataframe) {
    if (!exposureIds.has(hedge.exposure_id)) {
      errors.push(`Hedge ${hedge.hedge_id} referencia exposição inexistente.`);
    }
    if (!instrumentIds.has(hedge.instrument_id)) {
      errors.push(`Hedge ${hedge.hedge_id} referencia instrumento inexistente.`);
    }
  }
  for (const calculation of dataframes.calculation_dataframe) {
    if (!scenarioIds.has(calculation.scenario_id)) {
      errors.push(`Cálculo ${calculation.calculation_id} referencia cenário inexistente.`);
    }
  }
  const economicSituationIds = new Set((dataframes.economic_situation_dataframe ?? []).map(row => row.economic_situation_id));
  const riskFactorIds = new Set((dataframes.risk_factor_dataframe ?? []).map(row => row.risk_factor_id));
  const alternativeIds = new Set((dataframes.hedge_alternative_dataframe ?? []).map(row => row.alternative_id));
  const calculationIds = new Set(dataframes.calculation_dataframe.map(row => row.calculation_id));
  for (const riskFactor of dataframes.risk_factor_dataframe ?? []) if (!economicSituationIds.has(riskFactor.economic_situation_id)) errors.push(`Fator de risco ${riskFactor.risk_factor_id} referencia situação econômica inexistente.`);
  for (const alternative of dataframes.hedge_alternative_dataframe ?? []) {
    if (!economicSituationIds.has(alternative.economic_situation_id)) errors.push(`Alternativa ${alternative.alternative_id} referencia situação econômica inexistente.`);
    if (!riskFactorIds.has(alternative.risk_factor_id)) errors.push(`Alternativa ${alternative.alternative_id} referencia fator de risco inexistente.`);
  }
  for (const sizing of dataframes.hedge_sizing_dataframe ?? []) {
    if (!alternativeIds.has(sizing.alternative_id)) errors.push(`Dimensionamento ${sizing.sizing_id} referencia alternativa inexistente.`);
    if (!economicSituationIds.has(sizing.economic_situation_id)) errors.push(`Dimensionamento ${sizing.sizing_id} referencia situação econômica inexistente.`);
  }
  for (const result of dataframes.scenario_result_dataframe ?? []) {
    if (!scenarioIds.has(result.scenario_id)) errors.push(`Resultado de cenário ${result.scenario_result_id} referencia cenário inexistente.`);
    if (result.alternative_id && !alternativeIds.has(result.alternative_id)) errors.push(`Resultado de cenário ${result.scenario_result_id} referencia alternativa inexistente.`);
    if (result.calculation_id && !calculationIds.has(result.calculation_id)) errors.push(`Resultado de cenário ${result.scenario_result_id} referencia cálculo inexistente.`);
  }
  for (const observationLink of dataframes.b3_observation_link_dataframe ?? []) {
    if (!alternativeIds.has(observationLink.alternative_id)) errors.push(`Observação B3 ${observationLink.observation_link_id} referencia alternativa inexistente.`);
    if (observationLink.price_source.source_asof !== observationLink.instrument_source.source_asof) errors.push(`Observação B3 ${observationLink.observation_link_id} possui PriceReport e InstrumentReport com datas-base divergentes.`);
  }

  return errors;
}

export function createScenarioBundle(input: {
  bundleId: string;
  exportedAtUtc: string;
  dataframes: HedgeLabDataFrames;
}): HedgeLabScenarioBundle {
  const parsed = scenarioBundleInputSchema.parse({
    bundle_schema_version: HEDGE_LAB_BUNDLE_SCHEMA_VERSION,
    bundle_id: input.bundleId,
    exported_at_utc: input.exportedAtUtc,
    dataframes: input.dataframes,
  });

  const relationshipErrors = validateRelationships(parsed.dataframes as HedgeLabDataFrames);
  if (relationshipErrors.length > 0) {
    throw new Error(`Pacote de cenário inválido: ${relationshipErrors.join(" ")}`);
  }

  const canonicalPayload = canonicalJson(parsed);
  return {
    ...parsed,
    dataframes: parsed.dataframes as HedgeLabDataFrames,
    bundle_sha256: sha256(canonicalPayload),
  };
}

export function importScenarioBundle(serializedBundle: string): HedgeLabScenarioBundle {
  const parsedUnknown: unknown = JSON.parse(serializedBundle);
  const candidate = z
    .object({
      ...scenarioBundleInputSchema.shape,
      bundle_sha256: z.string().regex(/^[a-f0-9]{64}$/, "Hash SHA-256 inválido."),
    })
    .parse(parsedUnknown);

  const { bundle_sha256, ...withoutHash } = candidate;
  const expectedHash = sha256(canonicalJson(withoutHash));
  if (bundle_sha256 !== expectedHash) {
    throw new Error("A integridade do pacote não foi confirmada: hash divergente.");
  }

  const relationshipErrors = validateRelationships(candidate.dataframes as HedgeLabDataFrames);
  if (relationshipErrors.length > 0) {
    throw new Error(`Pacote de cenário inválido: ${relationshipErrors.join(" ")}`);
  }

  return candidate as HedgeLabScenarioBundle;
}

function escapeCsv(value: unknown): string {
  const text = value === null || value === undefined ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function dataframeToCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return "";
  const columns = Array.from(new Set(rows.flatMap(row => Object.keys(row)))).sort();
  const body = rows.map(row => columns.map(column => escapeCsv(row[column])).join(","));
  return [columns.join(","), ...body].join("\n");
}

export function lineageToRows(lineage: DataLineage[]): LineageRow[] {
  return lineage.map(item => ({
    source_id: item.sourceId,
    source_url: item.sourceUrl,
    source_file: item.sourceFile,
    extracted_at_utc: item.extractedAtUtc,
    source_asof: item.sourceAsOf,
    source_hash_sha256: item.sourceHashSha256,
    parser_version: item.parserVersion,
    validation_status: item.validationStatus,
  }));
}

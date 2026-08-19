import { buildB3MarketDataset } from "./b3MarketDataset";
import type { B3InstrumentType, B3MarketObservationRow, B3PriceRow, InstrumentMasterRow, SupportedB3Family } from "./dataframes";

export type B3NormalizedSource = {
  sourceId: "B3_PUBLIC_FILES";
  sourceUrl: string;
  sourceFile: string;
  sourceAsOf: string | null;
  sourceHashSha256: string | null;
  validationStatus: "valid" | "warning" | "invalid";
};

export type B3NormalizedManifest = {
  schemaVersion: "1.0.0";
  source: B3NormalizedSource;
  records: number;
  columns: string[];
  csv: { storageKey: string; sha256: string };
};

const numericPriceFields = [
  "tradeQuantity", "nationalFinancialVolume", "internationalFinancialVolume", "openInterest", "financialInstrumentQuantity",
  "bestBidPrice", "bestAskPrice", "firstPrice", "minimumPrice", "maximumPrice", "tradeAveragePrice", "lastPrice",
  "regularTransactionsQuantity", "nonRegularTransactionsQuantity", "regularTradedContracts", "nonRegularTradedContracts",
  "nationalRegularVolume", "nationalNonRegularVolume", "internationalRegularVolume", "internationalNonRegularVolume",
  "adjustedQuote", "adjustedQuoteTax", "previousAdjustedQuote", "previousAdjustedQuoteTax", "oscillationPercentage",
  "variationPoints", "equivalentValue", "adjustedValueContract", "maximumTradeLimit", "minimumTradeLimit",
] as const;

function nullable(value: string | undefined): string | null {
  const normalized = value?.trim() ?? "";
  return normalized === "" ? null : normalized;
}

function nullableNumber(value: string | undefined, field: string): number | null {
  const text = nullable(value);
  if (text === null) return null;
  const numeric = Number(text);
  if (!Number.isFinite(numeric)) throw new Error(`CSV B3 normalizado inválido: ${field} não é numérico.`);
  return numeric;
}

/** Leitor de CSV RFC 4180 compatível com o serializador interno de DataFrames. */
export function parseNormalizedCsv(text: string): Array<Record<string, string>> {
  const source = text.replace(/^\uFEFF/, "");
  const records: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]!;
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') { cell += '"'; index += 1; continue; }
      if (character === '"') { quoted = false; continue; }
      cell += character;
      continue;
    }
    if (character === '"') { quoted = true; continue; }
    if (character === ",") { row.push(cell); cell = ""; continue; }
    if (character === "\n") { row.push(cell); records.push(row); row = []; cell = ""; continue; }
    if (character === "\r") continue;
    cell += character;
  }
  if (quoted) throw new Error("CSV B3 normalizado inválido: aspas sem fechamento.");
  if (cell.length > 0 || row.length > 0) { row.push(cell); records.push(row); }
  const [header, ...body] = records;
  if (!header || header.length === 0 || header.some(field => !field.trim())) throw new Error("CSV B3 normalizado inválido: cabeçalho ausente.");
  if (new Set(header).size !== header.length) throw new Error("CSV B3 normalizado inválido: cabeçalho duplicado.");
  return body.filter(values => values.some(value => value !== "")).map((values, index) => {
    if (values.length !== header.length) throw new Error(`CSV B3 normalizado inválido: linha ${index + 2} possui ${values.length} campos; esperados ${header.length}.`);
    return Object.fromEntries(header.map((field, position) => [field, values[position] ?? ""]));
  });
}

function requireText(row: Record<string, string>, field: string): string {
  const value = nullable(row[field]);
  if (value === null) throw new Error(`CSV B3 normalizado inválido: campo obrigatório ${field} ausente.`);
  return value;
}

export function readNormalizedPriceRows(csv: string): B3PriceRow[] {
  return parseNormalizedCsv(csv).map(row => {
    const reportType = requireText(row, "reportType");
    if (reportType !== "BVBG.086.01" && reportType !== "BVBG.187.01") throw new Error(`CSV B3 normalizado inválido: reportType ${reportType} não é PriceReport.`);
    const parsed: Record<string, unknown> = { ...row };
    for (const field of numericPriceFields) parsed[field] = nullableNumber(row[field], field);
    const nullableFields = ["sourceMessageType", "marketDataStreamId", "nationalFinancialVolumeCurrency", "internationalFinancialVolumeCurrency", "bestBidPriceCurrency", "bestAskPriceCurrency", "firstPriceCurrency", "minimumPriceCurrency", "maximumPriceCurrency", "tradeAveragePriceCurrency", "lastPriceCurrency", "nationalRegularVolumeCurrency", "nationalNonRegularVolumeCurrency", "internationalRegularVolumeCurrency", "internationalNonRegularVolumeCurrency", "adjustedQuoteCurrency", "adjustedQuoteTaxCurrency", "adjustedQuoteSituation", "previousAdjustedQuoteCurrency", "previousAdjustedQuoteTaxCurrency", "previousAdjustedQuoteSituation", "variationPointsCurrency", "equivalentValueCurrency", "adjustedValueContractCurrency", "maximumTradeLimitCurrency", "minimumTradeLimitCurrency", "daysToSettlement", "sourceHashSha256"];
    for (const field of nullableFields) parsed[field] = nullable(row[field]);
    return {
      ...parsed,
      tradeDate: requireText(row, "tradeDate"), symbol: requireText(row, "symbol"), instrumentId: requireText(row, "instrumentId"), marketIdentifierCode: requireText(row, "marketIdentifierCode"), reportType,
      sourceFile: requireText(row, "sourceFile"), sourceHashSha256: nullable(row.sourceHashSha256),
    } as B3PriceRow;
  });
}

export function readNormalizedInstrumentRows(csv: string): InstrumentMasterRow[] {
  return parseNormalizedCsv(csv).map(row => {
    const instrumentType = requireText(row, "instrument_type");
    if (instrumentType !== "FUTURE" && instrumentType !== "OPTION" && instrumentType !== "OTHER") throw new Error(`CSV B3 normalizado inválido: instrument_type ${instrumentType} desconhecido.`);
    const family = requireText(row, "family") as SupportedB3Family;
    return {
      instrument_id: requireText(row, "instrument_id"), symbol: nullable(row.symbol), isin: nullable(row.isin), family, asset_class: "derivatives", instrument_type: instrumentType as B3InstrumentType,
      underlying_id: nullable(row.underlying_id), underlying_symbol: null, maturity: nullable(row.maturity), currency: nullable(row.currency), contract_size: null, tick_size: null, settlement_type: null,
      status: (nullable(row.status) ?? "unknown") as "active" | "inactive" | "unknown", source: "B3_PUBLIC_FILES", source_file: requireText(row, "source_file"), asof: nullable(row.asof),
      source_contract_multiplier: nullableNumber(row.source_contract_multiplier, "source_contract_multiplier"), source_asset_quotation_quantity: nullableNumber(row.source_asset_quotation_quantity, "source_asset_quotation_quantity"),
      option_type: nullable(row.option_type) as "CALL" | "PUT" | null, exercise_price: nullableNumber(row.exercise_price, "exercise_price"), exercise_style: nullable(row.exercise_style), contract_size_status: "not_inferred_from_bvbg_028_02",
    };
  });
}

export function buildNormalizedB3ObservationCandidates(input: { priceCsv: string; instrumentCsv: string; family: SupportedB3Family; limit?: number }) {
  const market = buildB3MarketDataset(readNormalizedPriceRows(input.priceCsv), readNormalizedInstrumentRows(input.instrumentCsv));
  if (market.associationStatus !== "valid") throw new Error("Observações B3 bloqueadas: PriceReport e InstrumentReport possuem datas-base divergentes.");
  const limit = input.limit ?? 200;
  return {
    associationStatus: market.associationStatus,
    candidates: market.dataframe
      .filter(row => row.family === input.family)
      .sort((left, right) => `${left.maturity ?? "9999-12-31"}|${left.symbol}`.localeCompare(`${right.maturity ?? "9999-12-31"}|${right.symbol}`))
      .slice(0, limit) as B3MarketObservationRow[],
    issues: market.issues,
  };
}

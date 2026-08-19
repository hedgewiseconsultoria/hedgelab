import { type Readable } from "node:stream";
import sax from "sax";
import { streamB3XmlText } from "./b3XmlDecoding";
import {
  type B3InstrumentRow,
  type B3InstrumentType,
  type DataLineage,
  type DatasetIssue,
  type InstrumentDataset,
  type InstrumentMasterRow,
  SUPPORTED_B3_FAMILIES,
  type SupportedB3Family,
} from "../domain/dataframes";

const PARSER_VERSION = "b3-bvbg-028-02-v1";
const supportedFamilies = new Set<string>(SUPPORTED_B3_FAMILIES);

export type B3InstrumentParseContext = Omit<DataLineage, "parserVersion" | "validationStatus">;

type MutableInstrument = Omit<B3InstrumentRow, "family" | "instrumentId" | "rawSchema"> & {
  family: string | null;
  instrumentId: string | null;
};

function newInstrument(): MutableInstrument {
  return {
    instrumentId: null,
    symbol: null,
    isin: null,
    family: null,
    assetDescription: null,
    description: null,
    instrumentType: "OTHER",
    underlyingInstrumentId: null,
    maturity: null,
    currency: null,
    contractMultiplier: null,
    assetQuotationQuantity: null,
    allocationRoundLot: null,
    exercisePrice: null,
    optionType: null,
    exerciseStyle: null,
    active: null,
    reportDate: null,
  };
}

function asNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asBoolean(value: string): boolean | null {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function mapOptionType(value: string): "CALL" | "PUT" | null {
  if (value === "CALL") return "CALL";
  if (value === "PUTT") return "PUT";
  return null;
}

function mapTextValue(target: MutableInstrument, path: string, value: string) {
  if (path.endsWith("/FinInstrmId/OthrId/Id")) target.instrumentId = value;
  if (path.endsWith("/FinInstrmAttrCmon/Asst")) target.family = value;
  if (path.endsWith("/FinInstrmAttrCmon/AsstDesc")) target.assetDescription = value;
  if (path.endsWith("/FinInstrmAttrCmon/Desc")) target.description = value;
  if (path.endsWith("/RptParams/ActvtyInd")) target.active = asBoolean(value);
  if (path.endsWith("/RptParams/RptDtAndTm/Dt")) target.reportDate = value;

  if (path.includes("/FutrCtrctsInf/")) {
    target.instrumentType = "FUTURE";
    if (path.endsWith("/TckrSymb")) target.symbol = value;
    if (path.endsWith("/ISIN")) target.isin = value;
    if (path.endsWith("/XprtnDt")) target.maturity = value;
    if (path.endsWith("/TradgCcy")) target.currency = value;
    if (path.endsWith("/CtrctMltplr")) target.contractMultiplier = asNumber(value);
    if (path.endsWith("/AsstQtnQty")) target.assetQuotationQuantity = asNumber(value);
    if (path.endsWith("/AllcnRndLot")) target.allocationRoundLot = asNumber(value);
    if (path.endsWith("/UndrlygInstrmId/OthrId/Id")) target.underlyingInstrumentId = value;
  }

  if (path.includes("/OptnOnSpotAndFutrsInf/")) {
    target.instrumentType = "OPTION";
    if (path.endsWith("/TckrSymb")) target.symbol = value;
    if (path.endsWith("/ISIN")) target.isin = value;
    if (path.endsWith("/XprtnDt")) target.maturity = value;
    if (path.endsWith("/TradgCcy")) target.currency = value;
    if (path.endsWith("/CtrctMltplr")) target.contractMultiplier = asNumber(value);
    if (path.endsWith("/AsstQtnQty")) target.assetQuotationQuantity = asNumber(value);
    if (path.endsWith("/AllcnRndLot")) target.allocationRoundLot = asNumber(value);
    if (path.endsWith("/ExrcPric")) target.exercisePrice = asNumber(value);
    if (path.endsWith("/OptnTp")) target.optionType = mapOptionType(value);
    if (path.endsWith("/ExrcStyle")) target.exerciseStyle = value;
    if (path.endsWith("/UndrlygInstrmId/OthrId/Id")) target.underlyingInstrumentId = value;
  }
}

function normalizeInstrument(instrument: MutableInstrument): B3InstrumentRow | null {
  if (!instrument.family || !supportedFamilies.has(instrument.family) || !instrument.instrumentId) return null;

  return {
    instrumentId: instrument.instrumentId,
    symbol: instrument.symbol,
    isin: instrument.isin,
    family: instrument.family as SupportedB3Family,
    assetDescription: instrument.assetDescription,
    description: instrument.description,
    instrumentType: instrument.instrumentType as B3InstrumentType,
    underlyingInstrumentId: instrument.underlyingInstrumentId,
    maturity: instrument.maturity,
    currency: instrument.currency,
    contractMultiplier: instrument.contractMultiplier,
    assetQuotationQuantity: instrument.assetQuotationQuantity,
    allocationRoundLot: instrument.allocationRoundLot,
    exercisePrice: instrument.exercisePrice,
    optionType: instrument.optionType,
    exerciseStyle: instrument.exerciseStyle,
    active: instrument.active,
    reportDate: instrument.reportDate,
    rawSchema: "bvmf.100.02",
  };
}

function validateRows(rows: B3InstrumentRow[]): DatasetIssue[] {
  const issues: DatasetIssue[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    if (seen.has(row.instrumentId)) {
      issues.push({
        code: "DUPLICATE_INSTRUMENT_ID",
        severity: "error",
        instrumentId: row.instrumentId,
        message: "Identificador de instrumento duplicado no conjunto normalizado.",
      });
    }
    seen.add(row.instrumentId);

    if (!row.symbol) {
      issues.push({
        code: "MISSING_SYMBOL",
        severity: "warning",
        instrumentId: row.instrumentId,
        message: "Instrumento sem símbolo de negociação no bloco XML observado.",
      });
    }
    if ((row.instrumentType === "FUTURE" || row.instrumentType === "OPTION") && !row.maturity) {
      issues.push({
        code: "MISSING_MATURITY",
        severity: "error",
        instrumentId: row.instrumentId,
        message: "Futuro ou opção sem vencimento no bloco XML observado.",
      });
    }
    if (row.instrumentType === "OPTION" && !row.underlyingInstrumentId) {
      issues.push({
        code: "OPTION_UNDERLYING_MISSING",
        severity: "error",
        instrumentId: row.instrumentId,
        message: "Opção sem identificador de ativo-objeto; bloqueada para o Hedge Engine.",
      });
    }
    if (row.instrumentType === "OTHER") {
      issues.push({
        code: "UNKNOWN_INSTRUMENT_TYPE",
        severity: "warning",
        instrumentId: row.instrumentId,
        message: "Tipo de instrumento não mapeado pelo parser atual.",
      });
    }
  }

  return issues;
}

function toInstrumentMaster(rows: B3InstrumentRow[], sourceFile: string): InstrumentMasterRow[] {
  return rows.map(row => ({
    instrument_id: row.instrumentId,
    symbol: row.symbol,
    isin: row.isin,
    family: row.family,
    asset_class: "derivatives",
    instrument_type: row.instrumentType,
    underlying_id: row.underlyingInstrumentId,
    underlying_symbol: null,
    maturity: row.maturity,
    currency: row.currency,
    contract_size: null,
    tick_size: null,
    settlement_type: null,
    status: row.active === true ? "active" : row.active === false ? "inactive" : "unknown",
    source: "B3_PUBLIC_FILES",
    source_file: sourceFile,
    asof: row.reportDate,
    source_contract_multiplier: row.contractMultiplier,
    source_asset_quotation_quantity: row.assetQuotationQuantity,
    option_type: row.optionType,
    exercise_price: row.exercisePrice,
    exercise_style: row.exerciseStyle,
    contract_size_status: "not_inferred_from_bvbg_028_02",
  }));
}

function buildCoverage(rows: B3InstrumentRow[]): InstrumentDataset["coverage"] {
  return SUPPORTED_B3_FAMILIES.map(family => {
    const maturities = rows
      .filter(row => row.family === family)
      .map(row => row.maturity)
      .filter((value): value is string => Boolean(value))
      .sort();
    return {
      family,
      records: rows.filter(row => row.family === family).length,
      firstMaturity: maturities.at(0) ?? null,
      lastMaturity: maturities.at(-1) ?? null,
    };
  });
}

export async function parseB3InstrumentXmlStream(
  readable: Readable,
  context: B3InstrumentParseContext,
): Promise<InstrumentDataset> {
  const rows: B3InstrumentRow[] = [];
  let currentInstrument: MutableInstrument | null = null;
  const stack: string[] = [];
  const textByPath = new Map<string, string>();
  const saxStream = sax.createStream(true, { trim: true, normalize: false });

  await new Promise<void>((resolve, reject) => {
    saxStream.on("opentag", tag => {
      stack.push(tag.name);
      if (tag.name === "Instrm") currentInstrument = newInstrument();
    });

    saxStream.on("text", text => {
      if (!currentInstrument || !text.trim()) return;
      const path = stack.join("/");
      textByPath.set(path, `${textByPath.get(path) ?? ""}${text}`);
    });

    saxStream.on("closetag", tagName => {
      const path = stack.join("/");
      if (currentInstrument) {
        const value = textByPath.get(path)?.trim();
        if (value) mapTextValue(currentInstrument, path, value);
        textByPath.delete(path);
      }

      if (tagName === "Instrm" && currentInstrument) {
        const normalized = normalizeInstrument(currentInstrument);
        if (normalized) rows.push(normalized);
        currentInstrument = null;
        textByPath.clear();
      }
      stack.pop();
    });

    saxStream.on("error", reject);
    saxStream.on("end", resolve);
    void streamB3XmlText(readable, text => saxStream.write(text))
      .then(() => saxStream.end())
      .catch(reject);
  });

  const issues = validateRows(rows);
  const validationStatus = issues.some(issue => issue.severity === "error")
    ? "invalid"
    : issues.length > 0
      ? "warning"
      : "valid";

  return {
    dataframe: rows,
    instrumentMasterDataframe: toInstrumentMaster(rows, context.sourceFile),
    coverage: buildCoverage(rows),
    lineage: {
      ...context,
      parserVersion: PARSER_VERSION,
      validationStatus,
    },
    issues,
  };
}

import sax from "sax";
import type { Readable } from "node:stream";
import { streamB3XmlText } from "./b3XmlDecoding";
import {
  type B3PriceDataset,
  type B3PriceDatasetIssue,
  type B3PriceReportType,
  type B3PriceRow,
  type DataLineage,
} from "../domain/dataframes";

const PARSER_VERSION = "b3-bvbg-price-report-v1";

export type B3PriceParseContext = Omit<DataLineage, "parserVersion" | "validationStatus"> & {
  expectedReportType: B3PriceReportType;
  includeRow?: (row: B3PriceRow) => boolean;
};

type MutablePriceRow = Omit<B3PriceRow, "sourceFile" | "sourceHashSha256" | "reportType">;

function emptyRow(): MutablePriceRow {
  return {
    tradeDate: "",
    symbol: "",
    instrumentId: "",
    marketIdentifierCode: "",
    sourceMessageType: null,
    tradeQuantity: null,
    marketDataStreamId: null,
    nationalFinancialVolume: null,
    nationalFinancialVolumeCurrency: null,
    internationalFinancialVolume: null,
    internationalFinancialVolumeCurrency: null,
    openInterest: null,
    financialInstrumentQuantity: null,
    bestBidPrice: null,
    bestBidPriceCurrency: null,
    bestAskPrice: null,
    bestAskPriceCurrency: null,
    firstPrice: null,
    firstPriceCurrency: null,
    minimumPrice: null,
    minimumPriceCurrency: null,
    maximumPrice: null,
    maximumPriceCurrency: null,
    tradeAveragePrice: null,
    tradeAveragePriceCurrency: null,
    lastPrice: null,
    lastPriceCurrency: null,
    regularTransactionsQuantity: null,
    nonRegularTransactionsQuantity: null,
    regularTradedContracts: null,
    nonRegularTradedContracts: null,
    nationalRegularVolume: null,
    nationalRegularVolumeCurrency: null,
    nationalNonRegularVolume: null,
    nationalNonRegularVolumeCurrency: null,
    internationalRegularVolume: null,
    internationalRegularVolumeCurrency: null,
    internationalNonRegularVolume: null,
    internationalNonRegularVolumeCurrency: null,
    adjustedQuote: null,
    adjustedQuoteCurrency: null,
    adjustedQuoteTax: null,
    adjustedQuoteTaxCurrency: null,
    adjustedQuoteSituation: null,
    previousAdjustedQuote: null,
    previousAdjustedQuoteCurrency: null,
    previousAdjustedQuoteTax: null,
    previousAdjustedQuoteTaxCurrency: null,
    previousAdjustedQuoteSituation: null,
    oscillationPercentage: null,
    variationPoints: null,
    variationPointsCurrency: null,
    equivalentValue: null,
    equivalentValueCurrency: null,
    adjustedValueContract: null,
    adjustedValueContractCurrency: null,
    maximumTradeLimit: null,
    maximumTradeLimitCurrency: null,
    minimumTradeLimit: null,
    minimumTradeLimitCurrency: null,
    daysToSettlement: null,
  };
}

function numberOrNull(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function attributeCurrency(attributes: Record<string, unknown> | undefined): string | null {
  const value = attributes?.Ccy;
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function setAmount(
  row: MutablePriceRow,
  valueKey: keyof MutablePriceRow,
  currencyKey: keyof MutablePriceRow,
  value: string,
  attributes: Record<string, unknown> | undefined,
) {
  (row as Record<string, unknown>)[valueKey] = numberOrNull(value);
  (row as Record<string, unknown>)[currencyKey] = attributeCurrency(attributes);
}

function mapField(row: MutablePriceRow, path: string, value: string, attributes: Record<string, unknown> | undefined) {
  if (path.endsWith("/TradDt/Dt")) row.tradeDate = value;
  if (path.endsWith("/SctyId/TckrSymb")) row.symbol = value;
  if (path.endsWith("/FinInstrmId/OthrId/Id")) row.instrumentId = value;
  if (path.endsWith("/FinInstrmId/PlcOfListg/MktIdrCd")) row.marketIdentifierCode = value;
  if (path.endsWith("/TradDtls/DaysToSttlm")) row.daysToSettlement = value;
  if (path.endsWith("/TradDtls/TradQty")) row.tradeQuantity = numberOrNull(value);

  if (path.endsWith("/FinInstrmAttrbts/MktDataStrmId")) row.marketDataStreamId = value;
  if (path.endsWith("/FinInstrmAttrbts/NtlFinVol")) setAmount(row, "nationalFinancialVolume", "nationalFinancialVolumeCurrency", value, attributes);
  if (path.endsWith("/FinInstrmAttrbts/IntlFinVol")) setAmount(row, "internationalFinancialVolume", "internationalFinancialVolumeCurrency", value, attributes);
  if (path.endsWith("/FinInstrmAttrbts/OpnIntrst")) row.openInterest = numberOrNull(value);
  if (path.endsWith("/FinInstrmAttrbts/FinInstrmQty")) row.financialInstrumentQuantity = numberOrNull(value);
  if (path.endsWith("/FinInstrmAttrbts/BestBidPric")) setAmount(row, "bestBidPrice", "bestBidPriceCurrency", value, attributes);
  if (path.endsWith("/FinInstrmAttrbts/BestAskPric")) setAmount(row, "bestAskPrice", "bestAskPriceCurrency", value, attributes);
  if (path.endsWith("/FinInstrmAttrbts/FrstPric")) setAmount(row, "firstPrice", "firstPriceCurrency", value, attributes);
  if (path.endsWith("/FinInstrmAttrbts/MinPric")) setAmount(row, "minimumPrice", "minimumPriceCurrency", value, attributes);
  if (path.endsWith("/FinInstrmAttrbts/MaxPric")) setAmount(row, "maximumPrice", "maximumPriceCurrency", value, attributes);
  if (path.endsWith("/FinInstrmAttrbts/TradAvrgPric")) setAmount(row, "tradeAveragePrice", "tradeAveragePriceCurrency", value, attributes);
  if (path.endsWith("/FinInstrmAttrbts/LastPric")) setAmount(row, "lastPrice", "lastPriceCurrency", value, attributes);
  if (path.endsWith("/FinInstrmAttrbts/RglrTxsQty")) row.regularTransactionsQuantity = numberOrNull(value);
  if (path.endsWith("/FinInstrmAttrbts/NonRglrTxsQty")) row.nonRegularTransactionsQuantity = numberOrNull(value);
  if (path.endsWith("/FinInstrmAttrbts/RglrTraddCtrcts")) row.regularTradedContracts = numberOrNull(value);
  if (path.endsWith("/FinInstrmAttrbts/NonRglrTraddCtrcts")) row.nonRegularTradedContracts = numberOrNull(value);
  if (path.endsWith("/FinInstrmAttrbts/NtlRglrVol")) setAmount(row, "nationalRegularVolume", "nationalRegularVolumeCurrency", value, attributes);
  if (path.endsWith("/FinInstrmAttrbts/NtlNonRglrVol")) setAmount(row, "nationalNonRegularVolume", "nationalNonRegularVolumeCurrency", value, attributes);
  if (path.endsWith("/FinInstrmAttrbts/IntlRglrVol")) setAmount(row, "internationalRegularVolume", "internationalRegularVolumeCurrency", value, attributes);
  if (path.endsWith("/FinInstrmAttrbts/IntlNonRglrVol")) setAmount(row, "internationalNonRegularVolume", "internationalNonRegularVolumeCurrency", value, attributes);
  if (path.endsWith("/FinInstrmAttrbts/AdjstdQt")) setAmount(row, "adjustedQuote", "adjustedQuoteCurrency", value, attributes);
  if (path.endsWith("/FinInstrmAttrbts/AdjstdQtTax")) setAmount(row, "adjustedQuoteTax", "adjustedQuoteTaxCurrency", value, attributes);
  if (path.endsWith("/FinInstrmAttrbts/AdjstdQtStin")) row.adjustedQuoteSituation = value;
  if (path.endsWith("/FinInstrmAttrbts/PrvsAdjstdQt")) setAmount(row, "previousAdjustedQuote", "previousAdjustedQuoteCurrency", value, attributes);
  if (path.endsWith("/FinInstrmAttrbts/PrvsAdjstdQtTax")) setAmount(row, "previousAdjustedQuoteTax", "previousAdjustedQuoteTaxCurrency", value, attributes);
  if (path.endsWith("/FinInstrmAttrbts/PrvsAdjstdQtStin")) row.previousAdjustedQuoteSituation = value;
  if (path.endsWith("/FinInstrmAttrbts/OscnPctg")) row.oscillationPercentage = numberOrNull(value);
  if (path.endsWith("/FinInstrmAttrbts/VartnPts")) setAmount(row, "variationPoints", "variationPointsCurrency", value, attributes);
  if (path.endsWith("/FinInstrmAttrbts/EqvtVal")) setAmount(row, "equivalentValue", "equivalentValueCurrency", value, attributes);
  if (path.endsWith("/FinInstrmAttrbts/AdjstdValCtrct")) setAmount(row, "adjustedValueContract", "adjustedValueContractCurrency", value, attributes);
  if (path.endsWith("/FinInstrmAttrbts/MaxTradLmt")) setAmount(row, "maximumTradeLimit", "maximumTradeLimitCurrency", value, attributes);
  if (path.endsWith("/FinInstrmAttrbts/MinTradLmt")) setAmount(row, "minimumTradeLimit", "minimumTradeLimitCurrency", value, attributes);
}

function validateRow(row: MutablePriceRow): B3PriceDatasetIssue[] {
  const issues: B3PriceDatasetIssue[] = [];
  if (!row.tradeDate) issues.push({ code: "MISSING_TRADE_DATE", severity: "error", symbol: row.symbol || null, message: "Registro PricRpt sem data de negociação." });
  if (!row.symbol) issues.push({ code: "MISSING_SYMBOL", severity: "error", symbol: null, message: "Registro PricRpt sem TckrSymb." });
  if (!row.instrumentId) issues.push({ code: "MISSING_INSTRUMENT_ID", severity: "error", symbol: row.symbol || null, message: "Registro PricRpt sem identificador proprietário." });
  if (!row.marketIdentifierCode) issues.push({ code: "MISSING_MARKET_IDENTIFIER", severity: "error", symbol: row.symbol || null, message: "Registro PricRpt sem MktIdrCd." });
  return issues;
}

export async function parseB3PriceReportXmlStream(readable: Readable, context: B3PriceParseContext): Promise<B3PriceDataset> {
  const rows: B3PriceRow[] = [];
  const issues: B3PriceDatasetIssue[] = [];
  const observedFields = new Set<string>();
  const stack: string[] = [];
  const textByPath = new Map<string, string>();
  const attributesByPath = new Map<string, Record<string, unknown>>();
  let currentRow: MutablePriceRow | null = null;
  const header = { reportType: null as string | null, messageType: null as string | null, totalMessages: null as number | null, createdAt: null as string | null };
  const saxStream = sax.createStream(true, { trim: true, normalize: false });

  await new Promise<void>((resolve, reject) => {
    saxStream.on("opentag", tag => {
      stack.push(tag.name);
      const path = stack.join("/");
      attributesByPath.set(path, tag.attributes as Record<string, unknown>);
      if (tag.name === "PricRpt") currentRow = emptyRow();
      if (currentRow && stack.includes("PricRpt")) observedFields.add(tag.name);
    });
    saxStream.on("text", text => {
      if (!text.trim()) return;
      const path = stack.join("/");
      textByPath.set(path, `${textByPath.get(path) ?? ""}${text}`);
    });
    saxStream.on("closetag", tagName => {
      const path = stack.join("/");
      const value = textByPath.get(path)?.trim();
      if (value && currentRow && stack.includes("PricRpt")) mapField(currentRow, path, value, attributesByPath.get(path));
      if (value && !currentRow) {
        if (path.endsWith("/BizGrpDtls/BizGrpTp") && header.reportType === null) header.reportType = value;
        if (path.endsWith("/BizGrpDesc/MsgTpDef/MsgDefIdr") && header.messageType === null) header.messageType = value;
        if (path.endsWith("/BizGrpDtls/TtlNbOfMsg") && header.totalMessages === null) header.totalMessages = numberOrNull(value);
        if (path.endsWith("/BizGrpDtls/CreDtAndTm") && header.createdAt === null) header.createdAt = value;
      }
      textByPath.delete(path);
      attributesByPath.delete(path);
      if (tagName === "PricRpt" && currentRow) {
        currentRow.sourceMessageType = header.messageType;
        const row = { ...currentRow, reportType: context.expectedReportType, sourceFile: context.sourceFile, sourceHashSha256: context.sourceHashSha256 };
        if (!context.includeRow || context.includeRow(row)) {
          issues.push(...validateRow(currentRow));
          rows.push(row);
        }
        currentRow = null;
      }
      stack.pop();
    });
    saxStream.on("error", reject);
    saxStream.on("end", resolve);
    void streamB3XmlText(readable, text => saxStream.write(text))
      .then(() => saxStream.end())
      .catch(reject);
  });

  if (header.reportType !== context.expectedReportType) issues.push({ code: "PRICE_REPORT_TYPE_MISMATCH", severity: "error", symbol: null, message: `Cabeçalho ${header.reportType ?? "ausente"} não corresponde a ${context.expectedReportType}.` });
  if (header.messageType !== "BVMF.217.01") issues.push({ code: "UNEXPECTED_MESSAGE_TYPE", severity: "error", symbol: null, message: `Mensagem ${header.messageType ?? "ausente"} não corresponde a BVMF.217.01.` });
  const validationStatus = issues.some(issue => issue.severity === "error") ? "invalid" : issues.length > 0 ? "warning" : "valid";
  return { dataframe: rows, observedFields: Array.from(observedFields).sort(), issues, header, lineage: { ...context, parserVersion: PARSER_VERSION, validationStatus } };
}

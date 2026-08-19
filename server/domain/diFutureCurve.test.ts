import { describe, expect, it } from "vitest";
import { buildDiFutureCurveVertices } from "./diFutureCurve";
import type { B3MarketDataset, B3MarketObservationRow } from "./dataframes";

function diRow(overrides: Partial<B3MarketObservationRow> = {}): B3MarketObservationRow {
  return {
    tradeDate: "2026-08-14", symbol: "DI1U26", instrumentId: "DI1-SEP-26", marketIdentifierCode: "BVMF", reportType: "BVBG.086.01", sourceMessageType: "BVMF.217.01",
    tradeQuantity: null, marketDataStreamId: null, nationalFinancialVolume: null, nationalFinancialVolumeCurrency: null, internationalFinancialVolume: null, internationalFinancialVolumeCurrency: null,
    openInterest: null, financialInstrumentQuantity: null, bestBidPrice: null, bestBidPriceCurrency: null, bestAskPrice: null, bestAskPriceCurrency: null, firstPrice: null, firstPriceCurrency: null,
    minimumPrice: null, minimumPriceCurrency: null, maximumPrice: null, maximumPriceCurrency: null, tradeAveragePrice: null, tradeAveragePriceCurrency: null, lastPrice: null, lastPriceCurrency: null,
    regularTransactionsQuantity: null, nonRegularTransactionsQuantity: null, regularTradedContracts: null, nonRegularTradedContracts: null, nationalRegularVolume: null, nationalRegularVolumeCurrency: null,
    nationalNonRegularVolume: null, nationalNonRegularVolumeCurrency: null, internationalRegularVolume: null, internationalRegularVolumeCurrency: null, internationalNonRegularVolume: null, internationalNonRegularVolumeCurrency: null,
    adjustedQuote: null, adjustedQuoteCurrency: null, adjustedQuoteTax: 14.366, adjustedQuoteTaxCurrency: "BRL", adjustedQuoteSituation: null, previousAdjustedQuote: null, previousAdjustedQuoteCurrency: null,
    previousAdjustedQuoteTax: null, previousAdjustedQuoteTaxCurrency: null, previousAdjustedQuoteSituation: null, oscillationPercentage: null, variationPoints: null, variationPointsCurrency: null,
    equivalentValue: null, equivalentValueCurrency: null, adjustedValueContract: null, adjustedValueContractCurrency: null, maximumTradeLimit: null, maximumTradeLimitCurrency: null, minimumTradeLimit: null, minimumTradeLimitCurrency: null,
    daysToSettlement: null, sourceFile: "BVBG.086.01.xml", sourceHashSha256: "a".repeat(64), family: "DI1", instrumentType: "FUTURE", maturity: "2026-09-01", optionType: null, exercisePrice: null, underlyingInstrumentId: null, instrumentReportAsOf: "2026-08-14",
    ...overrides,
  };
}

function market(dataframe: B3MarketObservationRow[], associationStatus: B3MarketDataset["associationStatus"] = "valid"): B3MarketDataset {
  return { dataframe, associationStatus, coverage: [], issues: [] };
}

describe("buildDiFutureCurveVertices", () => {
  it("preserva a taxa de ajuste B3 e calcula DU somente no calendário validado", () => {
    const result = buildDiFutureCurveVertices(market([diRow(), diRow({ instrumentId: "DI1-DEC-26", symbol: "DI1Z26", maturity: "2026-12-01", adjustedQuoteTax: 14.1 })]));
    expect(result.status).toBe("valid_market_vertices");
    expect(result.dataframe.map(point => point.symbol)).toEqual(["DI1U26", "DI1Z26"]);
    expect(result.dataframe[0]).toMatchObject({ adjusted_rate_pct_aa252: 14.366, business_days_status: "validated", quotation_convention: "EFFECTIVE_ANNUAL_RATE_AA_252_PUBLISHED_BY_B3" });
    expect(result.dataframe[0]?.business_days_to_maturity).toBeGreaterThan(0);
  });

  it("não infere DU para vencimento fora do calendário oficial disponível", () => {
    const result = buildDiFutureCurveVertices(market([diRow({ maturity: "2027-01-04" })]));
    expect(result.status).toBe("warning");
    expect(result.dataframe[0]).toMatchObject({ business_days_to_maturity: null, business_days_status: "not_available_outside_calendar_coverage" });
    expect(result.issues.some(issue => issue.code === "BUSINESS_DAYS_OUTSIDE_CALENDAR_COVERAGE")).toBe(true);
  });

  it("bloqueia vértices se a associação B3 de preço e cadastro não for válida", () => {
    const result = buildDiFutureCurveVertices(market([diRow()], "blocked_asof_mismatch"));
    expect(result).toMatchObject({ status: "blocked", dataframe: [] });
    expect(result.issues[0]?.code).toBe("B3_ASSOCIATION_BLOCKED");
  });

  it("não converte preço em taxa quando a taxa de ajuste B3 não está materializada", () => {
    const result = buildDiFutureCurveVertices(market([diRow({ adjustedQuoteTax: null, adjustedQuote: 91_000 })]));
    expect(result).toMatchObject({ status: "warning", dataframe: [] });
    expect(result.issues[0]?.code).toBe("MISSING_DI1_RATE");
  });
});

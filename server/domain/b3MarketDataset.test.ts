import { describe, expect, it } from "vitest";
import { buildB3MarketDataset } from "./b3MarketDataset";
import type { B3PriceRow, InstrumentMasterRow } from "./dataframes";

const instrument: InstrumentMasterRow = { instrument_id: "100", symbol: "DI1Z28", isin: null, family: "DI1", asset_class: "derivatives", instrument_type: "FUTURE", underlying_id: null, underlying_symbol: null, maturity: "2028-12-01", currency: "BRL", contract_size: null, tick_size: null, settlement_type: null, status: "active", source: "B3_PUBLIC_FILES", source_file: "IN.xml", asof: "2026-08-14", source_contract_multiplier: null, source_asset_quotation_quantity: null, contract_size_status: "not_inferred_from_bvbg_028_02" };
const price: B3PriceRow = { tradeDate: "2026-08-14", symbol: "DI1Z28", instrumentId: "100", marketIdentifierCode: "BVMF", reportType: "BVBG.086.01", sourceMessageType: "BVMF.217.01", tradeQuantity: 1, marketDataStreamId: null, nationalFinancialVolume: null, nationalFinancialVolumeCurrency: null, internationalFinancialVolume: null, internationalFinancialVolumeCurrency: null, openInterest: null, financialInstrumentQuantity: null, bestBidPrice: null, bestBidPriceCurrency: null, bestAskPrice: null, bestAskPriceCurrency: null, firstPrice: null, firstPriceCurrency: null, minimumPrice: null, minimumPriceCurrency: null, maximumPrice: null, maximumPriceCurrency: null, tradeAveragePrice: null, tradeAveragePriceCurrency: null, lastPrice: 14.3, lastPriceCurrency: "BRL", regularTransactionsQuantity: null, nonRegularTransactionsQuantity: null, regularTradedContracts: null, nonRegularTradedContracts: null, nationalRegularVolume: null, nationalRegularVolumeCurrency: null, nationalNonRegularVolume: null, nationalNonRegularVolumeCurrency: null, internationalRegularVolume: null, internationalRegularVolumeCurrency: null, internationalNonRegularVolume: null, internationalNonRegularVolumeCurrency: null, adjustedQuote: null, adjustedQuoteCurrency: null, adjustedQuoteTax: 14.366, adjustedQuoteTaxCurrency: "BRL", adjustedQuoteSituation: null, previousAdjustedQuote: null, previousAdjustedQuoteCurrency: null, previousAdjustedQuoteTax: null, previousAdjustedQuoteTaxCurrency: null, previousAdjustedQuoteSituation: null, oscillationPercentage: null, variationPoints: null, variationPointsCurrency: null, equivalentValue: null, equivalentValueCurrency: null, adjustedValueContract: null, adjustedValueContractCurrency: null, maximumTradeLimit: null, maximumTradeLimitCurrency: null, minimumTradeLimit: null, minimumTradeLimitCurrency: null, daysToSettlement: null, sourceFile: "PR.xml", sourceHashSha256: "hash" };

describe("DataFrame de mercado B3 associado ao cadastro", () => {
  it("associa preço e tipo pelo identificador de instrumento", () => {
    const dataset = buildB3MarketDataset([price], [instrument]);
    expect(dataset.associationStatus).toBe("valid");
    expect(dataset.dataframe[0]).toMatchObject({ family: "DI1", instrumentType: "FUTURE", maturity: "2028-12-01", adjustedQuoteTax: 14.366 });
    expect(dataset.coverage.find(item => item.family === "DI1")).toMatchObject({ records: 1, futureRecords: 1, recordsWithAdjustedQuote: 1 });
  });

  it("associa por símbolo quando os identificadores técnicos dos boletins divergem", () => {
    const dataset = buildB3MarketDataset([{ ...price, instrumentId: "price-id", symbol: "DI1Z28" }], [{ ...instrument, instrument_id: "instrument-id" }]);
    expect(dataset.dataframe).toHaveLength(1);
    expect(dataset.dataframe[0]).toMatchObject({ symbol: "DI1Z28", family: "DI1", instrumentType: "FUTURE", maturity: "2028-12-01" });
  });

  it("não classifica por ticker quando o identificador e o símbolo não estão no InstrumentReport", () => {
    const dataset = buildB3MarketDataset([{ ...price, instrumentId: "ausente", symbol: "DOLX26" }], []);
    expect(dataset.dataframe).toHaveLength(0);
    expect(dataset.issues.some(issue => issue.code === "PRICE_INSTRUMENT_NOT_IN_MASTER")).toBe(true);
  });

  it("bloqueia a associação quando preço e InstrumentReport têm datas-base distintas", () => {
    const dataset = buildB3MarketDataset([price], [{ ...instrument, asof: "2026-08-17" }]);
    expect(dataset.associationStatus).toBe("blocked_asof_mismatch");
    expect(dataset.dataframe).toHaveLength(0);
    expect(dataset.issues.some(issue => issue.code === "PRICE_INSTRUMENT_ASOF_MISMATCH")).toBe(true);
  });

  it("preserva tipo e strike de uma opção quando o cadastro B3 os informa", () => {
    const option = { ...instrument, instrument_id: "200", symbol: "DOLC26", family: "DOL" as const, instrument_type: "OPTION" as const, maturity: "2026-12-01", underlying_id: "100", option_type: "CALL" as const, exercise_price: 5.2, exercise_style: "EUROPEAN" };
    const dataset = buildB3MarketDataset([{ ...price, instrumentId: "200", symbol: "DOLC26" }], [option]);
    expect(dataset.dataframe[0]).toMatchObject({ optionType: "CALL", exercisePrice: 5.2, underlyingInstrumentId: "100" });
  });
});

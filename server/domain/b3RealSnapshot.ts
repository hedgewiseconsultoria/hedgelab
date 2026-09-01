/**
 * Metadados do pipeline executado sobre arquivos oficiais B3 reais.
 * Não contém preços individuais; os CSVs e o manifesto reprodutível ficam em
 * /home/ubuntu/hedge-lab-data/curated/b3/2026-08-13 fora do projeto web.
 */
export const B3_REAL_SNAPSHOT = {
  asOf: "2026-08-13",
  generatedAtUtc: "2026-08-17T22:42:00.000Z",
  association: {
    status: "valid",
    priceAsOf: "2026-08-13",
    instrumentReportAsOf: "2026-08-13",
    calculationUse: "allowed_for_validated_dataframes",
    message: "PriceReport, DerivativesSimplifiedPriceReport e InstrumentReport foram recuperados pela B3 para a mesma data-base. A associação é permitida apenas para os DataFrames validados deste manifesto.",
  },
  layout: {
    filename: "Catalogo_precos_v1.3.pdf",
    sha256: "2ebdea0162594b64f0cb00dd4b85bb3818b04ca039985e40215c91d439f7d850",
    url: "https://www.b3.com.br/data/files/16/70/29/9C/6219D710C8F297D7AC094EA8/Catalogo_precos_v1.3.pdf",
  },
  files: [
    { reportType: "BVBG.086.01", filename: "BVBG.086.01_BV000328202608130328000001842591837.xml", sha256: "cf823459800119a9b8f72803ef77b15845b76d06e83d3e39c670fe7b39587ab0", records: 66387, downloadUrl: "https://www.b3.com.br/pesquisapregao/download?filelist=PR260813.zip," },
    { reportType: "BVBG.187.01", filename: "BVBG.187.01_BV000471202608130001000071916496500.xml", sha256: "57b911da684ebb5929a857dcbc717229de3444cf419ac336bef3250b322f6538", records: 2250, downloadUrl: "https://www.b3.com.br/pesquisapregao/download?filelist=SPRD260813.zip," },
    { reportType: "BVBG.028.02", filename: "BVBG.028.02_BV000327202608130327114794456547280.xml", sha256: "d2a1aca58567fbc3a1cd23c40617902d92fc1868fcb5e0a7d9df621688946e5d", records: 8437, downloadUrl: "https://www.b3.com.br/pesquisapregao/download?filelist=IN260813.zip," },
  ],
  columns: [
    "tradeDate", "symbol", "instrumentId", "marketIdentifierCode", "sourceMessageType", "tradeQuantity", "marketDataStreamId", "nationalFinancialVolume", "nationalFinancialVolumeCurrency", "internationalFinancialVolume", "internationalFinancialVolumeCurrency", "openInterest", "financialInstrumentQuantity", "bestBidPrice", "bestBidPriceCurrency", "bestAskPrice", "bestAskPriceCurrency", "firstPrice", "firstPriceCurrency", "minimumPrice", "minimumPriceCurrency", "maximumPrice", "maximumPriceCurrency", "tradeAveragePrice", "tradeAveragePriceCurrency", "lastPrice", "lastPriceCurrency", "regularTransactionsQuantity", "nonRegularTransactionsQuantity", "regularTradedContracts", "nonRegularTradedContracts", "nationalRegularVolume", "nationalRegularVolumeCurrency", "nationalNonRegularVolume", "nationalNonRegularVolumeCurrency", "internationalRegularVolume", "internationalRegularVolumeCurrency", "internationalNonRegularVolume", "internationalNonRegularVolumeCurrency", "adjustedQuote", "adjustedQuoteCurrency", "adjustedQuoteTax", "adjustedQuoteTaxCurrency", "adjustedQuoteSituation", "previousAdjustedQuote", "previousAdjustedQuoteCurrency", "previousAdjustedQuoteTax", "previousAdjustedQuoteTaxCurrency", "previousAdjustedQuoteSituation", "oscillationPercentage", "variationPoints", "variationPointsCurrency", "equivalentValue", "equivalentValueCurrency", "adjustedValueContract", "adjustedValueContractCurrency", "maximumTradeLimit", "maximumTradeLimitCurrency", "minimumTradeLimit", "minimumTradeLimitCurrency", "daysToSettlement", "reportType", "sourceFile", "sourceHashSha256", "family", "instrumentType", "maturity", "optionType", "exercisePrice", "underlyingInstrumentId", "instrumentReportAsOf",
  ],
  coverage086: [
    ["DI1", 45, 45, 0, 43, 45], ["DOL", 2066, 24, 2042, 16, 24], ["WDO", 191, 23, 168, 11, 23], ["DDI", 45, 45, 0, 7, 45], ["BGI", 798, 16, 782, 24, 16], ["CCM", 664, 12, 652, 25, 12], ["SOY", 3, 3, 0, 0, 3], ["ICF", 240, 6, 226, 15, 6], ["ETH", 24, 12, 12, 5, 12], ["CNL", 6, 4, 2, 0, 4], ["SJC", 247, 7, 240, 3, 7],
  ].map(([family, records, futureRecords, optionRecords, recordsWithTradePrice, recordsWithAdjustedQuote]) => ({ family, records, futureRecords, optionRecords, recordsWithTradePrice, recordsWithAdjustedQuote })),
  coverage187: [
    ["DI1", 45, 45, 0, 43, 45], ["DOL", 504, 24, 480, 16, 24], ["WDO", 38, 23, 15, 11, 23], ["DDI", 45, 45, 0, 7, 45], ["BGI", 305, 9, 296, 17, 9], ["CCM", 286, 8, 278, 21, 8], ["SOY", 3, 3, 0, 0, 3], ["ICF", 56, 5, 43, 14, 5], ["ETH", 16, 12, 4, 5, 12], ["CNL", 4, 4, 0, 0, 4], ["SJC", 46, 7, 39, 3, 7],
  ].map(([family, records, futureRecords, optionRecords, recordsWithTradePrice, recordsWithAdjustedQuote]) => ({ family, records, futureRecords, optionRecords, recordsWithTradePrice, recordsWithAdjustedQuote })),
  limitation: "Este endpoint expõe somente manifesto e cobertura de uma execução real documentada. Preços individuais não são embutidos nem simulados pela aplicação; métodos quantitativos permanecem sujeitos às convenções específicas de cada instrumento.",
} as const;

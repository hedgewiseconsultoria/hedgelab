import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ collectB3OfficialPriceReport: vi.fn(), collectB3OfficialReport: vi.fn(), fetchPtaxUsdDay: vi.fn(), fetchBcbSelicSgs: vi.fn(), fetchBcbSelicAnnualized252: vi.fn(), fetchIbgeIpcaMonthlyVariation: vi.fn(), fetchAnbimaEttj: vi.fn(), fetchFgvIgpmPublishedTable: vi.fn(), storagePut: vi.fn(), storageGetSignedUrl: vi.fn() }));
vi.mock("./ingestion/b3OfficialDownload", () => ({ collectB3OfficialPriceReport: mocks.collectB3OfficialPriceReport, collectB3OfficialReport: mocks.collectB3OfficialReport }));
vi.mock("./ingestion/bcbPtax", () => ({ fetchPtaxUsdDay: mocks.fetchPtaxUsdDay }));
vi.mock("./ingestion/bcbSelic", () => ({ fetchBcbSelicSgs: mocks.fetchBcbSelicSgs, fetchBcbSelicAnnualized252: mocks.fetchBcbSelicAnnualized252 }));
vi.mock("./ingestion/ibgeIpca", () => ({ fetchIbgeIpcaMonthlyVariation: mocks.fetchIbgeIpcaMonthlyVariation }));
vi.mock("./ingestion/anbimaEttj", () => ({ fetchAnbimaEttj: mocks.fetchAnbimaEttj }));
vi.mock("./ingestion/fgvIgpm", () => ({ fetchFgvIgpmPublishedTable: mocks.fetchFgvIgpmPublishedTable }));
vi.mock("./storage", () => ({ storagePut: mocks.storagePut, storageGetSignedUrl: mocks.storageGetSignedUrl }));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { sha256Text } from "./domain/dataframeArtifact";

const ctx = {
  user: null,
  req: { protocol: "https", headers: {} },
  res: {},
} as TrpcContext;

function mockedDownload(reportType: "BVBG.086.01" | "BVBG.187.01") {
  return {
    reportType,
    sourceAsOf: "2026-08-13",
    officialDownloadUrl: "https://www.b3.com.br/pesquisapregao/download?filelist=PR260813.zip%2C",
    validationStatus: "downloaded",
    outerArchive: { filename: "PR260813.zip", bytes: 12494986, sha256: "outer-hash", storageKey: "b3/raw/2026-08-13/PR260813.zip", storageUrl: "/manus-storage/b3/raw/2026-08-13/PR260813.zip" },
    innerArchive: { filename: "PR260813.zip", bytes: 13730641, sha256: "inner-hash" },
    xmlFiles: [{ filename: `${reportType}_real.xml`, bytes: 150813745, sha256: "xml-hash", body: Buffer.from("não deve sair pela API") }],
  };
}

describe("marketData.collectB3Reports", () => {
  beforeEach(() => { mocks.collectB3OfficialPriceReport.mockReset(); mocks.collectB3OfficialReport.mockReset(); mocks.fetchPtaxUsdDay.mockReset(); mocks.fetchBcbSelicSgs.mockReset(); mocks.fetchBcbSelicAnnualized252.mockReset(); mocks.fetchAnbimaEttj.mockReset(); mocks.fetchIbgeIpcaMonthlyVariation.mockReset(); mocks.fetchFgvIgpmPublishedTable.mockReset(); mocks.storagePut.mockReset(); mocks.storageGetSignedUrl.mockReset(); });

  it("coleta os boletins selecionados, persiste o bruto e remove bytes dos XMLs da resposta", async () => {
    mocks.collectB3OfficialPriceReport
      .mockResolvedValueOnce(mockedDownload("BVBG.086.01"))
      .mockResolvedValueOnce(mockedDownload("BVBG.187.01"));

    const result = await appRouter.createCaller(ctx).marketData.collectB3Reports({
      asOf: "2026-08-13",
      reportTypes: ["BVBG.086.01", "BVBG.187.01"],
    });

    expect(mocks.collectB3OfficialPriceReport).toHaveBeenNthCalledWith(1, { reportType: "BVBG.086.01", asOf: "2026-08-13", persistRaw: true, timeoutMs: 150_000 });
    expect(mocks.collectB3OfficialPriceReport).toHaveBeenNthCalledWith(2, { reportType: "BVBG.187.01", asOf: "2026-08-13", persistRaw: true, timeoutMs: 150_000 });
    expect(result.storageMode).toBe("object_storage_without_database");
    expect(result.reports).toHaveLength(2);
    expect(result.reports[0]?.xmlFiles[0]).toEqual({ filename: "BVBG.086.01_real.xml", bytes: 150813745, sha256: "xml-hash" });
    expect(result.reports[0]?.xmlFiles[0]).not.toHaveProperty("body");
  });

  it("aceita o InstrumentReport no mesmo fluxo B3 sem tratá-lo como PriceReport", async () => {
    const instrumentDownload = { ...mockedDownload("BVBG.086.01"), reportType: "BVBG.028.02" as const, xmlFiles: [{ filename: "BVBG.028.02_real.xml", bytes: 123, sha256: "instrument-hash", body: Buffer.from("instrumento") }] };
    mocks.collectB3OfficialReport.mockResolvedValueOnce(instrumentDownload);
    const result = await appRouter.createCaller(ctx).marketData.collectB3Reports({ asOf: "2026-08-13", reportTypes: ["BVBG.028.02"], normalize: false });
    expect(mocks.collectB3OfficialReport).toHaveBeenCalledWith({ reportType: "BVBG.028.02", asOf: "2026-08-13", persistRaw: true, timeoutMs: 150_000 });
    expect(result.reports[0]).toMatchObject({ reportType: "BVBG.028.02", xmlFiles: [{ filename: "BVBG.028.02_real.xml", sha256: "instrument-hash" }] });
  });

  it("lê candidatos B3 normalizados por família somente com cadastro e preço na mesma data-base", async () => {
    const priceCsv = ["tradeDate,symbol,instrumentId,marketIdentifierCode,reportType,sourceFile,sourceHashSha256,lastPrice,adjustedQuote", `2026-08-17,DOLU26,ID-DOL,IMERC,BVBG.086.01,BVBG.086.01_real.xml,${"a".repeat(64)},5.4,5.39`].join("\n");
    const instrumentCsv = ["instrument_id,symbol,family,instrument_type,maturity,status,source_file,asof", "ID-DOL,DOLU26,DOL,FUTURE,2026-09-01,active,BVBG.028.02_real.xml,2026-08-17"].join("\n");
    const priceManifestKey = "b3/normalized/2026-08-17/BVBG.086.01/price.manifest.json";
    const instrumentManifestKey = "b3/normalized/2026-08-17/BVBG.028.02/instrument.manifest.json";
    const priceCsvKey = "b3/normalized/2026-08-17/BVBG.086.01/price.csv";
    const instrumentCsvKey = "b3/normalized/2026-08-17/BVBG.028.02/instrument.csv";
    const objects: Record<string, string> = {
      [priceManifestKey]: JSON.stringify({ schemaVersion: "1.0.0", source: { sourceId: "B3_PUBLIC_FILES", sourceUrl: "https://www.b3.com.br/pesquisapregao/download", sourceFile: "BVBG.086.01_real.xml", sourceAsOf: "2026-08-17", sourceHashSha256: "a".repeat(64), validationStatus: "valid" }, records: 1, columns: ["symbol"], csv: { storageKey: priceCsvKey, sha256: sha256Text(Buffer.from(priceCsv, "utf8")) } }),
      [instrumentManifestKey]: JSON.stringify({ schemaVersion: "1.0.0", source: { sourceId: "B3_PUBLIC_FILES", sourceUrl: "https://www.b3.com.br/pesquisapregao/download", sourceFile: "BVBG.028.02_real.xml", sourceAsOf: "2026-08-17", sourceHashSha256: "b".repeat(64), validationStatus: "valid" }, records: 1, columns: ["symbol"], csv: { storageKey: instrumentCsvKey, sha256: sha256Text(Buffer.from(instrumentCsv, "utf8")) } }),
      [priceCsvKey]: priceCsv,
      [instrumentCsvKey]: instrumentCsv,
    };
    mocks.storageGetSignedUrl.mockImplementation((key: string) => Promise.resolve(`https://storage.test/${encodeURIComponent(key)}`));
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input: RequestInfo | URL) => {
      const key = decodeURIComponent(String(input).replace("https://storage.test/", ""));
      const text = objects[key];
      return Promise.resolve(new Response(text ?? "", { status: text === undefined ? 404 : 200 }));
    });

    const result = await appRouter.createCaller(ctx).marketData.readB3NormalizedObservations({ priceManifestStorageKey: priceManifestKey, instrumentManifestStorageKey: instrumentManifestKey, priceReportType: "BVBG.086.01", family: "DOL", limit: 25 });

    expect(result.associationStatus).toBe("valid");
    expect(result.candidates).toMatchObject([{ symbol: "DOLU26", family: "DOL", maturity: "2026-09-01", lastPrice: 5.4, adjustedQuote: 5.39 }]);
    expect(result.priceSource).toMatchObject({ sourceAsOf: "2026-08-17", sourceHashSha256: "a".repeat(64), normalizedCsvStorageKey: priceCsvKey });
    expect(result.instrumentSource).toMatchObject({ sourceAsOf: "2026-08-17", sourceHashSha256: "b".repeat(64), normalizedCsvStorageKey: instrumentCsvKey });
    fetchMock.mockRestore();
  });

  it("coleta PTAX e persiste payload bruto, CSV, manifesto e linhagem sem banco", async () => {
    mocks.fetchPtaxUsdDay.mockResolvedValue({
      raw: { value: [{ cotacaoVenda: 5.1 }] },
      dataframe: [{ observationId: "BCB_PTAX_USD_2026-08-13_1", asOf: "2026-08-13", cotacaoCompra: 5, cotacaoVenda: 5.1, dataHoraCotacaoOficial: "2026-08-13T13:00:00Z", quoteConvention: "UNIDADE_MONETARIA_CORRENTE_POR_DOLAR_AMERICANO" }],
      lineage: { sourceId: "BCB_PTAX", sourceUrl: "https://olinda.bcb.gov.br/ptax", sourceFile: "CotacaoDolarDia", extractedAtUtc: "2026-08-17T00:00:00.000Z", sourceAsOf: "2026-08-13", sourceHashSha256: "a".repeat(64), parserVersion: "bcb-ptax-odata-v1", validationStatus: "valid" },
    });
    mocks.storagePut.mockResolvedValueOnce({ key: "raw", url: "/storage/raw" }).mockResolvedValueOnce({ key: "csv", url: "/storage/csv" }).mockResolvedValueOnce({ key: "manifest", url: "/storage/manifest" });

    const result = await appRouter.createCaller(ctx).marketData.collectOfficialDataset({ sourceId: "BCB_PTAX", asOf: "2026-08-13" });

    expect(mocks.fetchPtaxUsdDay).toHaveBeenCalledWith("2026-08-13");
    expect(mocks.storagePut).toHaveBeenCalledTimes(3);
    expect(result).toMatchObject({ sourceId: "BCB_PTAX", records: 1, storageMode: "object_storage_without_database", lineage: { sourceHashSha256: "a".repeat(64) } });
    expect(result.columns).toContain("cotacaoVenda");
  });

  it("coleta a série SGS 11 Selic com período explícito sem inferir taxa over", async () => {
    mocks.fetchBcbSelicSgs.mockResolvedValue({
      raw: [{ data: "01/08/2026", valor: "14,15" }],
      dataframe: [{ observationId: "BCB_SGS_11_2026-08-01_1", asOf: "2026-08-01", valuePct: 14.15, seriesCode: 11, unit: "percent" }],
      lineage: { sourceId: "BCB_SGS_11_SELIC", sourceUrl: "https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados", sourceFile: "bcdata.sgs.11", extractedAtUtc: "2026-08-17T00:00:00.000Z", sourceAsOf: "2026-08-01", sourceHashSha256: "e".repeat(64), parserVersion: "bcb-sgs-11-v1", validationStatus: "valid" },
    });
    mocks.storagePut.mockResolvedValueOnce({ key: "raw", url: "/storage/raw" }).mockResolvedValueOnce({ key: "csv", url: "/storage/csv" }).mockResolvedValueOnce({ key: "manifest", url: "/storage/manifest" });

    const result = await appRouter.createCaller(ctx).marketData.collectOfficialDataset({ sourceId: "BCB_SGS_11_SELIC", startDate: "2026-08-01", endDate: "2026-08-01" });

    expect(mocks.fetchBcbSelicSgs).toHaveBeenCalledWith({ startDate: "2026-08-01", endDate: "2026-08-01" });
    expect(result).toMatchObject({ sourceId: "BCB_SGS_11_SELIC", records: 1, storageMode: "object_storage_without_database", lineage: { sourceHashSha256: "e".repeat(64) } });
  });

  it("coleta a SGS 1178 anualizada diretamente, com artefatos auditáveis e sem cálculo derivado", async () => {
    mocks.fetchBcbSelicAnnualized252.mockResolvedValue({
      raw: [{ data: "01/08/2026", valor: "14,15" }],
      dataframe: [{ observationId: "BCB_SGS_1178_2026-08-01_1", asOf: "2026-08-01", valuePct: 14.15, seriesCode: 1178, unit: "percent" }],
      lineage: { sourceId: "BCB_SGS_1178_SELIC_AA252", sourceUrl: "https://api.bcb.gov.br/dados/serie/bcdata.sgs.1178/dados", sourceFile: "bcdata.sgs.1178", extractedAtUtc: "2026-08-17T00:00:00.000Z", sourceAsOf: "2026-08-01", sourceHashSha256: "f".repeat(64), parserVersion: "bcb-sgs-1178-aa252-v1", validationStatus: "valid" },
    });
    mocks.storagePut.mockResolvedValueOnce({ key: "raw", url: "/storage/raw" }).mockResolvedValueOnce({ key: "csv", url: "/storage/csv" }).mockResolvedValueOnce({ key: "manifest", url: "/storage/manifest" });

    const result = await appRouter.createCaller(ctx).marketData.collectOfficialDataset({ sourceId: "BCB_SGS_1178_SELIC_AA252", startDate: "2026-08-01", endDate: "2026-08-01" });

    expect(mocks.fetchBcbSelicAnnualized252).toHaveBeenCalledWith({ startDate: "2026-08-01", endDate: "2026-08-01" });
    expect(result).toMatchObject({ sourceId: "BCB_SGS_1178_SELIC_AA252", records: 1, storageMode: "object_storage_without_database", lineage: { sourceHashSha256: "f".repeat(64) } });
  });

  it("coleta IPCA e preserva metadados e resposta oficial no artefato manual", async () => {
    mocks.fetchIbgeIpcaMonthlyVariation.mockResolvedValue({
      rawMetadata: { id: "1737" }, rawData: [{ id: "63" }],
      dataframe: [{ observationId: "IBGE_IPCA_202607_1", aggregateId: "1737", variableId: "63", variableName: "IPCA", unit: "%", period: "202607", localityId: "1", localityName: "Brasil", value: 0.2, unavailableSymbol: null }],
      lineage: { sourceId: "IBGE_IPCA", sourceUrl: "https://servicodados.ibge.gov.br/api/v3/agregados/1737", sourceFile: "1737/63", extractedAtUtc: "2026-08-17T00:00:00.000Z", sourceAsOf: "202607", sourceHashSha256: "b".repeat(64), parserVersion: "ibge-sidra-v3", validationStatus: "valid" },
    });
    mocks.storagePut.mockResolvedValueOnce({ key: "raw", url: "/storage/raw" }).mockResolvedValueOnce({ key: "csv", url: "/storage/csv" }).mockResolvedValueOnce({ key: "manifest", url: "/storage/manifest" });

    const result = await appRouter.createCaller(ctx).marketData.collectOfficialDataset({ sourceId: "IBGE_IPCA", period: "202607" });

    expect(mocks.fetchIbgeIpcaMonthlyVariation).toHaveBeenCalledWith("202607");
    expect(mocks.storagePut).toHaveBeenCalledTimes(3);
    expect(result).toMatchObject({ sourceId: "IBGE_IPCA", records: 1, storageMode: "object_storage_without_database", lineage: { sourceHashSha256: "b".repeat(64) } });
  });

  it("coleta a ETTJ ANBIMA e preserva o HTML bruto e a linhagem do calendário de 252 dias úteis", async () => {
    mocks.fetchAnbimaEttj.mockResolvedValue({
      rawHtml: "<html>ETTJ oficial</html>",
      dataframe: [{ asOf: "2026-08-13", vertexBusinessDays: 252, ettjIpcaPctAa252: 4.5, ettjPrePctAa252: 13, impliedInflationPctAa252: 7.5, unit: "%a.a./252" }],
      lineage: { sourceId: "ANBIMA_ETTJ", sourceUrl: "https://www.anbima.com.br/informacoes/est-termo/CZ.asp", sourceFile: "CZ.asp", extractedAtUtc: "2026-08-17T00:00:00.000Z", sourceAsOf: "2026-08-13", sourceHashSha256: "c".repeat(64), parserVersion: "anbima-ettj-public-page-v1", validationStatus: "valid" },
    });
    mocks.storagePut.mockResolvedValueOnce({ key: "raw", url: "/storage/raw" }).mockResolvedValueOnce({ key: "csv", url: "/storage/csv" }).mockResolvedValueOnce({ key: "manifest", url: "/storage/manifest" });

    const result = await appRouter.createCaller(ctx).marketData.collectOfficialDataset({ sourceId: "ANBIMA_ETTJ" });

    expect(mocks.fetchAnbimaEttj).toHaveBeenCalledWith();
    expect(mocks.storagePut).toHaveBeenCalledTimes(3);
    expect(result).toMatchObject({ sourceId: "ANBIMA_ETTJ", records: 1, storageMode: "object_storage_without_database", lineage: { sourceHashSha256: "c".repeat(64) } });
  });

  it("coleta o IGP-M FGV apenas pela URL oficial parametrizada e preserva o HTML bruto", async () => {
    mocks.fetchFgvIgpmPublishedTable.mockResolvedValue({
      rawHtml: "<html>IGP-M oficial</html>",
      dataframe: [{ observationId: "FGV_IGPM_202607", period: "202607", monthlyVariationPct: 0.2, trailingTwelveMonthsPct: 4.2, sourcePeriodLabel: "jul/26" }],
      lineage: { sourceId: "FGV_IGPM", sourceUrl: "https://portal.fgv.br/noticias/igp-m-2026", sourceFile: "igp-m-2026", extractedAtUtc: "2026-08-17T00:00:00.000Z", sourceAsOf: "202607", sourceHashSha256: "d".repeat(64), parserVersion: "fgv-igpm-publication-v1", validationStatus: "valid" },
    });
    mocks.storagePut.mockResolvedValueOnce({ key: "raw", url: "/storage/raw" }).mockResolvedValueOnce({ key: "csv", url: "/storage/csv" }).mockResolvedValueOnce({ key: "manifest", url: "/storage/manifest" });

    const result = await appRouter.createCaller(ctx).marketData.collectOfficialDataset({ sourceId: "FGV_IGPM", sourceUrl: "https://portal.fgv.br/noticias/igp-m-2026", year: 2026 });

    expect(mocks.fetchFgvIgpmPublishedTable).toHaveBeenCalledWith({ sourceUrl: "https://portal.fgv.br/noticias/igp-m-2026", year: 2026 });
    expect(mocks.storagePut).toHaveBeenCalledTimes(3);
    expect(result).toMatchObject({ sourceId: "FGV_IGPM", records: 1, storageMode: "object_storage_without_database", lineage: { sourceHashSha256: "d".repeat(64) } });
  });

  it("expõe D+1 e a linhagem do calendário oficial escolhido", async () => {
    const result = await appRouter.createCaller(ctx).marketData.businessCalendar({
      calendarId: "B3_TRADING_2026",
      date: "2026-12-23",
      endDate: "2026-12-28",
      offsetBusinessDays: 1,
    });
    expect(result.settlementD1).toBe("2026-12-28");
    expect(result.businessDaysToEnd).toBe(1);
    expect(result.lineage.sourceId).toBe("B3_TRADING_CALENDAR");
  });

  it("diagnostica alternativas antes de selecionar o derivativo para uma exposição em dólar", async () => {
    const result = await appRouter.createCaller(ctx).hedge.diagnoseAlternatives({ exposureId: "EXP-USD-001", kind: "USD_PAYABLE", description: "Importação", notional: 2_000_000, currency: "USD", maturityDate: "2026-12-15" });
    expect(result.diagnosis).toMatchObject({ riskFactor: "USD_BRL", hedgeDirection: "BUY" });
    expect(result.alternatives.map(item => item.kind)).toContain("B3_DOL_FUTURE");
    expect(result.alternatives.find(item => item.kind === "OTC_NDF_OR_TERM")?.status).toBe("contract_required");
  });

  it("expõe cenário linear parametrizado com resultado residual e limitações explícitas", async () => {
    const result = await appRouter.createCaller(ctx).hedge.linearFuturesScenario({
      scenarioId: "AULA-DOL", instrumentLabel: "DOL", economicDirection: "BUY", hedgePosition: "LONG", exposureQuantity: 100_000, hedgeContracts: 1, contractUnitQuantity: 50_000,
      initialPrice: 5, scenarioPrice: 5.2, quotationUnit: "BRL por USD", dataMode: "USER_PARAMETERIZED_SCENARIO",
      lineage: { sourceId: "USER_PARAMETERIZED_SCENARIO", sourceFile: "cenario-aula", sourceHashSha256: null, sourceAsOf: "2026-08-18", createdAtUtc: "2026-08-18T00:00:00.000Z" },
    });
    expect(result).toMatchObject({ unhedgedEconomicResult: -20_000, futuresResult: 10_000, residualResult: -10_000, hedgeCoverageRatio: 0.5 });
    expect(result.limitations.join(" ")).toContain("Resultado bruto linear");
  });

  it("expõe ajuste DI1 para posição iniciada hoje e posição em aberto com as evidências exigidas", async () => {
    const caller = appRouter.createCaller(ctx);
    const current = { sourceId: "B3_PUBLIC_FILES" as const, sourceAsOf: "2026-08-13", sourceFile: "PR260813.xml", sourceHashSha256: "a".repeat(64) };
    const initiated = await caller.hedge.di1VariationMargin({ position: "PU_BUYER", contracts: 1, positionState: "INITIATED_TODAY", settlementPuToday: 99_000, tradeRatePct: 14, businessDaysToDayBeforeExpiration: 252, settlementLineage: current });
    const outstanding = await caller.hedge.di1VariationMargin({ position: "PU_SELLER", contracts: 1, positionState: "OUTSTANDING_FROM_PREVIOUS_DAY", settlementPuToday: 99_100, settlementPuPreviousDay: 99_000, diRatesPctForCorrection: [14.25], settlementLineage: current, previousSettlementLineage: { ...current, sourceAsOf: "2026-08-12", sourceFile: "PR260812.xml", sourceHashSha256: "b".repeat(64) }, diRateLineage: { ...current, sourceFile: "DI260813.xml", sourceHashSha256: "c".repeat(64) } });
    expect(initiated.tradePu).not.toBeNull();
    expect(outstanding.correctionFactor).toBeGreaterThan(1);
    expect(outstanding.dailyVariationMarginBrl).toBeLessThan(0);
  });

  it("exporta e importa um DataFrame Parquet com hash verificável", async () => {
    const caller = appRouter.createCaller(ctx);
    const artifact = await caller.workspace.exportParquetDataFrame({ rows: [{ dataframe: "exposure", exposure_id: "EXP-1", notional: 100 }] });
    const rows = await caller.workspace.importParquetDataFrame({ bytesBase64: artifact.bytesBase64, sha256: artifact.manifest.sha256 });
    expect(artifact.manifest.rows).toBe(1);
    expect(rows).toEqual([{ dataframe: "exposure", exposure_id: "EXP-1", notional: 100 }]);
  });

  it("exporta e restaura a sessão completa em Parquet, vinculada ao bundle e manifesto auditáveis", async () => {
    const caller = appRouter.createCaller(ctx);
    const dataframes = {
      instrument_master_dataframe: [{
        instrument_id: "NDF-CLIENTE-001", kind: "OTC_NDF" as const, base_currency: "USD" as const, quote_currency: "BRL" as const,
        notional_base_currency: 100_000, trade_date: "2026-08-13", maturity: "2026-09-15", settlement_convention: "financeira D+1",
        terms: { forward_rate_brl_per_usd: 5.2, fixing_date: "2026-09-12", settlement_date: "2026-09-15" }, source: "USER_CONTRACT" as const,
        evidence_source_file: "contrato-ndf.pdf", evidence_source_url: "https://storage.example.test/contrato-ndf.pdf", evidence_sha256: "a".repeat(64),
        evidence_captured_at_utc: "2026-08-17T00:00:00.000Z", validation_status: "validated_user_contract" as const,
      }],
      exposure_dataframe: [{ exposure_id: "EXP-1", description: "Importação", currency: "USD", direction: "PAYABLE" as const, notional: 100_000, cashflow_date: "2026-09-15", created_at_utc: "2026-08-17T00:00:00.000Z" }],
      hedge_dataframe: [{ hedge_id: "HEDGE-1", exposure_id: "EXP-1", instrument_id: "NDF-CLIENTE-001", strategy: "NDF_CONTRATUAL", quantity: 1, trade_date: "2026-08-13", maturity: "2026-09-15", method_version: "contract-master-v1" }],
      scenario_dataframe: [{ scenario_id: "base", scenario_name: "Cenário base", fx_shock_pct: 0, rate_shock_bps: 0, volatility_shock_pct: null, created_at_utc: "2026-08-17T00:00:00.000Z" }],
      calculation_dataframe: [],
      lineage_dataframe: [{ source_id: "BCB_PTAX", source_url: "https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/", source_file: "CotacaoDolarDia", extracted_at_utc: "2026-08-17T00:00:00.000Z", source_asof: "2026-08-13", source_hash_sha256: null, parser_version: "1.0.0", validation_status: "valid" as const }],
    };
    const artifact = await caller.workspace.exportParquetScenario({ bundle_schema_version: "1.0.0", bundle_id: "sessao-teste", exported_at_utc: "2026-08-17T00:00:00.000Z", dataframes });
    const restored = await caller.workspace.importParquetScenario({ bytesBase64: artifact.bytesBase64, manifest: artifact.manifest });

    expect(artifact.manifest.dataframeRows).toEqual({ instrument_master_dataframe: 1, exposure_dataframe: 1, hedge_dataframe: 1, scenario_dataframe: 1, calculation_dataframe: 0, lineage_dataframe: 1 });
    expect(restored.bundle_sha256).toBe(artifact.manifest.scenarioBundle.bundle_sha256);
    expect(restored.dataframes).toEqual(dataframes);
    await expect(caller.workspace.importParquetScenario({ bytesBase64: artifact.bytesBase64, manifest: { ...artifact.manifest, dataframeRows: { ...artifact.manifest.dataframeRows, exposure_dataframe: 2 } } })).rejects.toThrow("contagem divergente");
  });

  it("preserva a evidência OTC em objeto e cria o master somente com o hash retornado", async () => {
    mocks.storagePut.mockResolvedValue({ key: "otc/contracts/abc_contrato.pdf", url: "/manus-storage/otc/contracts/abc_contrato.pdf" });
    const caller = appRouter.createCaller(ctx);
    const evidence = await caller.hedge.persistOtcContractEvidence({ fileName: "contrato NDF.pdf", contentBase64: Buffer.from("contrato de teste").toString("base64"), contentType: "application/pdf" });
    const master = await caller.hedge.createOtcInstrumentMaster({
      instrumentId: "NDF-001", kind: "OTC_NDF", baseCurrency: "USD", quoteCurrency: "BRL", notionalBaseCurrency: 100_000,
      tradeDate: "2026-08-13", maturityDate: "2026-09-14", settlementConvention: "financeira D+1", terms: { kind: "OTC_NDF", forwardRateBrlPerUsd: 5.2, fixingDate: "2026-09-12", settlementDate: "2026-09-14" }, evidence,
    });
    expect(evidence.sourceHashSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(master.validationStatus).toBe("validated_user_contract");
    expect(mocks.storagePut).toHaveBeenCalledOnce();
  });

  it("aceita pela rota e pelo pacote um swap de taxa somente com termos bilaterais declarados", async () => {
    const caller = appRouter.createCaller(ctx);
    const master = await caller.hedge.createOtcInstrumentMaster({
      instrumentId: "SWAP-CDI-001", kind: "OTC_RATE_SWAP", baseCurrency: "BRL", quoteCurrency: "BRL", notionalBaseCurrency: 5_000_000,
      tradeDate: "2026-08-13", maturityDate: "2027-08-13", settlementConvention: "Financeira conforme contrato",
      terms: { kind: "OTC_RATE_SWAP", payerLeg: "PAY_FIXED_RECEIVE_FLOATING", floatingLegIndex: "CDI", fixedLegConvention: "Taxa fixa conforme contrato", paymentSchedule: "Mensal conforme contrato", startDate: "2026-08-14", endDate: "2027-08-13" },
      evidence: { sourceId: "USER_CONTRACT", sourceUrl: null, sourceFile: "swap-cdi.pdf", sourceHashSha256: "b".repeat(64), capturedAtUtc: "2026-08-13T12:00:00.000Z" },
    });
    expect(master).toMatchObject({ kind: "OTC_RATE_SWAP", validationStatus: "validated_user_contract" });

    const artifact = await caller.workspace.exportParquetScenario({
      bundle_schema_version: "1.0.0", bundle_id: "swap-taxa", exported_at_utc: "2026-08-13T12:00:00.000Z",
      dataframes: {
        instrument_master_dataframe: [{ instrument_id: "SWAP-CDI-001", kind: "OTC_RATE_SWAP", base_currency: "BRL", quote_currency: "BRL", notional_base_currency: 5_000_000, trade_date: "2026-08-13", maturity: "2027-08-13", settlement_convention: "Financeira conforme contrato", terms: master.terms, source: "USER_CONTRACT", evidence_source_file: "swap-cdi.pdf", evidence_source_url: null, evidence_sha256: "b".repeat(64), evidence_captured_at_utc: "2026-08-13T12:00:00.000Z", validation_status: "validated_user_contract" }],
        exposure_dataframe: [], hedge_dataframe: [], scenario_dataframe: [], calculation_dataframe: [], lineage_dataframe: [],
      },
    });
    const restored = await caller.workspace.importParquetScenario({ bytesBase64: artifact.bytesBase64, manifest: artifact.manifest });
    expect(restored.dataframes.instrument_master_dataframe[0]).toMatchObject({ kind: "OTC_RATE_SWAP", base_currency: "BRL", quote_currency: "BRL" });
  });

  it("expõe hedge ratio e framework na rota integrada de efetividade", async () => {
    const result = await appRouter.createCaller(ctx).hedge.hedgeEffectiveness({
      hedgedItemChangeBrl: 100_000, hedgingInstrumentChangeBrl: -95_000,
      hedgedItemNotionalBrl: 1_000_000, hedgingInstrumentNotionalBrl: 900_000,
      accountingFramework: "IFRS9_CPC48", accountingPolicyReference: "POL-HDG-001",
      eligibility: { eligibleHedgingInstrument: true, eligibleHedgedItem: true, documentedAtInception: true, economicRelationship: true, creditRiskDominatesValueChanges: false, hedgeRatioMatchesActualQuantities: true },
      lineage: { valuationAsOf: "2026-08-13", cpc48Revision: "CPC_48_REV_14", cpc48SourceHashSha256: "90ff2efbbbb449b89c53947b2beafd9acc871beccfc5fd28d4d553752fc4e9a8", valuationSourceIds: ["BCB_PTAX", "B3_PUBLIC_FILES"] },
    });
    expect(result.actualNotionalHedgeRatio).toBeCloseTo(0.9, 8);
    expect(result.accountingFramework).toBe("IFRS9_CPC48");
    expect(result.accountingPolicyReference).toBe("POL-HDG-001");
  });

  it("expõe o gate distinto da rota quando a política IAS 39 legada é declarada", async () => {
    const result = await appRouter.createCaller(ctx).hedge.hedgeEffectiveness({
      hedgedItemChangeBrl: 100, hedgingInstrumentChangeBrl: -100, hedgedItemNotionalBrl: 100, hedgingInstrumentNotionalBrl: 100,
      accountingFramework: "IAS39_LEGACY", accountingPolicyReference: "POL-LEG-001",
      eligibility: { eligibleHedgingInstrument: true, eligibleHedgedItem: true, documentedAtInception: true, economicRelationship: true, creditRiskDominatesValueChanges: false, hedgeRatioMatchesActualQuantities: true },
      lineage: { valuationAsOf: "2026-08-13", cpc48Revision: "CPC_48_REV_14", cpc48SourceHashSha256: "90ff2efbbbb449b89c53947b2beafd9acc871beccfc5fd28d4d553752fc4e9a8", valuationSourceIds: ["BCB_PTAX"] },
    });
    expect(result.method).toBe("IAS39_LEGACY_POLICY_CHECK");
    expect(result.accountingPolicyReference).toBe("POL-LEG-001");
  });
});

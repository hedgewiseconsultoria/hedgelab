import { z } from "zod";
import { createHash } from "node:crypto";
import { Readable, Transform } from "node:stream";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { fetchAnbimaEttj } from "./ingestion/anbimaEttj";
import { fetchPtaxUsdDay } from "./ingestion/bcbPtax";
import { fetchBcbSelicAnnualized252, fetchBcbSelicSgs } from "./ingestion/bcbSelic";
import { fetchFgvIgpmPublishedTable } from "./ingestion/fgvIgpm";
import { fetchIbgeIpcaIndexNumber, fetchIbgeIpcaMonthlyVariation } from "./ingestion/ibgeIpca";
import { calculateIpcaAccumulated, previousMonthlyPeriod, type IpcaIndexOfficialDataset } from "./domain/ipcaAccumulation";
import { calculateSgs11OverAccumulation } from "./domain/sgs11OverAccumulation";
import { createScenarioBundle, importScenarioBundle, scenarioBundleInputSchema } from "./domain/scenarioBundle";
import { sizeB3FxFutureHedge } from "./domain/fxFuturesHedge";
import { sizeB3CommodityFutureHedge } from "./domain/commodityFuturesSizing";
import { sizeB3CommodityOptionReference } from "./domain/commodityOptionSizing";
import { sizeB3DollarOptionReference } from "./domain/fxOptionSizing";
import { calculateFxStress, calculateParametricVar, calculateResidualRisk } from "./domain/fxRiskScenario";
import { B3_REAL_SNAPSHOT } from "./domain/b3RealSnapshot";
import { collectB3OfficialPriceReport, collectB3OfficialReport, type B3OfficialXmlFile } from "./ingestion/b3OfficialDownload";
import { parseB3PriceReportXmlStream } from "./ingestion/b3PriceReportParser";
import { parseB3InstrumentXmlStream } from "./ingestion/b3InstrumentParser";
import { storageGetSignedUrl, storagePut } from "./storage";
import { dataframeToCsv, sha256Text } from "./domain/dataframeArtifact";
import { buildB3MarketDataset } from "./domain/b3MarketDataset";
import { buildDiFutureCurveVertices } from "./domain/diFutureCurve";
import { diagnoseHedgeAlternatives } from "./domain/hedgeAlternatives";
import { materializeCanonicalHedgeDataframes } from "./domain/canonicalHedgeDataframes";
import { BUSINESS_CALENDARS, addBusinessDays, businessDaysBetween, isBusinessDay, settlementDateD1 } from "./domain/businessCalendar";
import { calculateNdfSettlementScenario } from "./domain/ndfSettlement";
import { calculateB3DollarOptionIntrinsicSettlement } from "./domain/b3DollarOptionSettlement";
import { calculateB3OptionPremiumMtmGreeks } from "./domain/b3OptionPremiumMtmGreeks";
import { calculateB3CornOptionIntrinsicSettlement } from "./domain/b3CornOptionSettlement";
import { calculateB3CattleOptionIntrinsicSettlement } from "./domain/b3CattleOptionSettlement";
import { calculateB3SoyOptionIntrinsicSettlement } from "./domain/b3SoyOptionSettlement";
import { calculateB3SjcOptionIntrinsicSettlement } from "./domain/b3SjcOptionSettlement";
import { calculateB3FxFutureDailySettlement } from "./domain/b3FxFutureSettlement";
import { calculateDi1VariationMargin } from "./domain/di1VariationMargin";
import { calculateBcbTraditionalFxSwapScenario } from "./domain/fxSwapScenario";
import { assessHedgeEffectiveness } from "./domain/hedgeEffectiveness";
import { calculateLinearFuturesScenario } from "./domain/linearFuturesScenario";
import { OFFICIAL_INSTRUMENT_MASTER, createOtcInstrumentMaster } from "./domain/instrumentMaster";
import { createParquetDataFrameArtifact, createParquetScenarioArtifact, readParquetDataFrameArtifact, readParquetScenarioArtifact, type ParquetScenarioManifest } from "./domain/parquetArtifact";
import { buildNormalizedB3ObservationCandidates, type B3NormalizedManifest } from "./domain/b3NormalizedObservations";

const B3_NORMALIZED_STORAGE_PREFIX = "b3/normalized/";
const B3_DI1_DOWNLOAD_TIMEOUT_MS = 45_000;
const B3_BULLETIN_DOWNLOAD_TIMEOUT_MS = 150_000;

function b3AvailabilityReason(error: unknown) {
  const message = error instanceof Error ? error.message : "Falha sem mensagem legível.";
  if (/não respondeu|tentativas esgotadas|respondeu 5\d\d|respondeu 429/i.test(message)) return "A B3 não respondeu dentro da janela de atualização. Nenhum dado substituto foi utilizado; tente novamente mais tarde.";
  if (/HTML|ZIP válido|pacote vazio|não contém XML/i.test(message)) return "A B3 não devolveu um arquivo oficial utilizável para esta data-base. Nenhum DataFrame foi publicado.";
  return "A coleta oficial não pôde ser validada nesta tentativa. Nenhum dado ou cálculo dependente desta fonte foi liberado.";
}

async function openB3XmlWithIncrementalHash(xml: B3OfficialXmlFile) {
  const raw = xml.body ? Readable.from([xml.body]) : xml.openStream ? await xml.openStream() : null;
  if (!raw) throw new Error(`O XML ${xml.filename} não possui stream para normalização.`);
  const hash = createHash("sha256");
  const hashed = new Transform({ transform(chunk, _encoding, callback) { hash.update(chunk); callback(null, chunk); } });
  raw.once("error", error => hashed.destroy(error));
  raw.pipe(hashed);
  return {
    stream: hashed as Readable,
    finalizeHash: () => {
      const computed = hash.digest("hex");
      xml.sha256 ??= computed;
      return xml.sha256;
    },
  };
}

function assertB3NormalizedStorageKey(key: string, kind: "manifest" | "csv") {
  if (!key.startsWith(B3_NORMALIZED_STORAGE_PREFIX)) throw new Error(`Chave de ${kind} rejeitada: o artefato deve pertencer ao pipeline normalizado B3.`);
  if (kind === "manifest" && !key.endsWith(".manifest.json")) throw new Error("Chave de manifesto B3 inválida.");
  if (kind === "csv" && !key.endsWith(".csv")) throw new Error("Chave de CSV B3 inválida.");
}

async function readStoredB3Text(storageKey: string, kind: "manifest" | "csv") {
  assertB3NormalizedStorageKey(storageKey, kind);
  const signedUrl = await storageGetSignedUrl(storageKey);
  const response = await fetch(signedUrl);
  if (!response.ok) throw new Error(`Não foi possível ler o ${kind} B3 normalizado (${response.status}).`);
  return Buffer.from(await response.arrayBuffer()).toString("utf8");
}

async function readB3NormalizedManifest(storageKey: string) {
  const text = await readStoredB3Text(storageKey, "manifest");
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new Error("Manifesto B3 normalizado inválido: JSON não pôde ser interpretado."); }
  const manifest = z.object({
    schemaVersion: z.literal("1.0.0"),
    source: z.object({ sourceId: z.literal("B3_PUBLIC_FILES"), sourceUrl: z.string().url(), sourceFile: z.string().min(1), sourceAsOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(), sourceHashSha256: z.string().regex(/^[a-f0-9]{64}$/).nullable(), validationStatus: z.enum(["valid", "warning", "invalid"]) }),
    records: z.number().int().nonnegative(),
    columns: z.array(z.string().min(1)),
    csv: z.object({ storageKey: z.string().min(1), sha256: z.string().regex(/^[a-f0-9]{64}$/) }),
  }).parse(parsed) as B3NormalizedManifest;
  assertB3NormalizedStorageKey(manifest.csv.storageKey, "csv");
  if (!manifest.source.sourceAsOf || !manifest.source.sourceHashSha256 || manifest.source.validationStatus !== "valid") throw new Error("Manifesto B3 normalizado bloqueado: fonte sem data-base, hash ou validação válida.");
  const csvText = await readStoredB3Text(manifest.csv.storageKey, "csv");
  if (sha256Text(Buffer.from(csvText, "utf8")) !== manifest.csv.sha256) throw new Error("CSV B3 normalizado rejeitado: hash divergente do manifesto.");
  return { manifest, csvText, manifestStorageKey: storageKey };
}

async function normalizeCollectedB3PriceXml(input: {
  reportType: "BVBG.086.01" | "BVBG.187.01";
  asOf: string;
  officialDownloadUrl: string;
  collectedAtUtc: string;
  xml: B3OfficialXmlFile;
}) {
  const source = await openB3XmlWithIncrementalHash(input.xml);
  const dataset = await parseB3PriceReportXmlStream(source.stream, {
    sourceId: "B3_PUBLIC_FILES",
    sourceUrl: input.officialDownloadUrl,
    sourceFile: input.xml.filename,
    extractedAtUtc: input.collectedAtUtc,
    sourceAsOf: input.asOf,
    sourceHashSha256: input.xml.sha256,
    expectedReportType: input.reportType,
  });
  dataset.lineage.sourceHashSha256 = source.finalizeHash();
  const csv = dataframeToCsv(dataset.dataframe as Array<Record<string, unknown>>);
  const csvBytes = Buffer.from(`\ufeff${csv}`, "utf8");
  const csvFilename = input.xml.filename.replace(/\.xml$/i, ".csv");
  const keyPrefix = `b3/normalized/${input.asOf}/${input.reportType}/${csvFilename}`;
  const csvStored = await storagePut(keyPrefix, csvBytes, "text/csv; charset=utf-8");
  const manifest = {
    schemaVersion: "1.0.0",
    generatedAtUtc: input.collectedAtUtc,
    source: dataset.lineage,
    records: dataset.dataframe.length,
    columns: dataset.dataframe.length ? Object.keys(dataset.dataframe[0]!) : [],
    observedFields: dataset.observedFields,
    issues: dataset.issues,
    csv: { filename: csvFilename, bytes: csvBytes.length, sha256: sha256Text(csvBytes), storageKey: csvStored.key, storageUrl: csvStored.url },
  };
  const manifestStored = await storagePut(`${keyPrefix}.manifest.json`, JSON.stringify(manifest, null, 2), "application/json");
  return {
    sourceFile: input.xml.filename,
    validationStatus: dataset.lineage.validationStatus,
    records: dataset.dataframe.length,
    columns: manifest.columns,
    observedFields: dataset.observedFields,
    issueCount: dataset.issues.length,
    csv: manifest.csv,
    manifest: { storageKey: manifestStored.key, storageUrl: manifestStored.url },
  };
}

async function normalizeCollectedB3InstrumentXml(input: {
  asOf: string;
  officialDownloadUrl: string;
  collectedAtUtc: string;
  xml: B3OfficialXmlFile;
}) {
  const source = await openB3XmlWithIncrementalHash(input.xml);
  const dataset = await parseB3InstrumentXmlStream(source.stream, {
    sourceId: "B3_PUBLIC_FILES",
    sourceUrl: input.officialDownloadUrl,
    sourceFile: input.xml.filename,
    extractedAtUtc: input.collectedAtUtc,
    sourceAsOf: input.asOf,
    sourceHashSha256: input.xml.sha256,
  });
  dataset.lineage.sourceHashSha256 = source.finalizeHash();
  const csvBytes = Buffer.from(`\ufeff${dataframeToCsv(dataset.instrumentMasterDataframe as Array<Record<string, unknown>>)}`, "utf8");
  const csvFilename = input.xml.filename.replace(/\.xml$/i, ".instrument-master.csv");
  const keyPrefix = `b3/normalized/${input.asOf}/BVBG.028.02/${csvFilename}`;
  const csvStored = await storagePut(keyPrefix, csvBytes, "text/csv; charset=utf-8");
  const manifest = {
    schemaVersion: "1.0.0",
    generatedAtUtc: input.collectedAtUtc,
    source: dataset.lineage,
    records: dataset.instrumentMasterDataframe.length,
    columns: dataset.instrumentMasterDataframe.length ? Object.keys(dataset.instrumentMasterDataframe[0]!) : [],
    rawInstrumentRecords: dataset.dataframe.length,
    coverage: dataset.coverage,
    issues: dataset.issues,
    csv: { filename: csvFilename, bytes: csvBytes.length, sha256: sha256Text(csvBytes), storageKey: csvStored.key, storageUrl: csvStored.url },
  };
  const manifestStored = await storagePut(`${keyPrefix}.manifest.json`, JSON.stringify(manifest, null, 2), "application/json");
  return {
    sourceFile: input.xml.filename,
    validationStatus: dataset.lineage.validationStatus,
    records: dataset.instrumentMasterDataframe.length,
    columns: manifest.columns,
    observedFields: [],
    issueCount: dataset.issues.length,
    csv: manifest.csv,
    manifest: { storageKey: manifestStored.key, storageUrl: manifestStored.url },
  };
}

async function collectAndBuildB3DiFutureCurve(input: { asOf: string }) {
  const collectedAtUtc = new Date().toISOString();
  const [priceDownload, instrumentDownload] = await Promise.all([
    collectB3OfficialReport({ reportType: "BVBG.086.01", asOf: input.asOf, persistRaw: false, timeoutMs: B3_DI1_DOWNLOAD_TIMEOUT_MS, maxAttempts: 1 }),
    collectB3OfficialReport({ reportType: "BVBG.028.02", asOf: input.asOf, persistRaw: false, timeoutMs: B3_DI1_DOWNLOAD_TIMEOUT_MS, maxAttempts: 1 }),
  ]);
  const priceDatasets = [];
  for (const xml of priceDownload.xmlFiles) {
    const source = await openB3XmlWithIncrementalHash(xml);
    const dataset = await parseB3PriceReportXmlStream(source.stream, {
      sourceId: "B3_PUBLIC_FILES", sourceUrl: priceDownload.officialDownloadUrl, sourceFile: xml.filename, extractedAtUtc: collectedAtUtc,
      sourceAsOf: input.asOf, sourceHashSha256: xml.sha256, expectedReportType: "BVBG.086.01", includeRow: row => row.symbol.startsWith("DI1"),
    });
    dataset.lineage.sourceHashSha256 = source.finalizeHash();
    priceDatasets.push(dataset);
  }
  const instrumentDatasets = [];
  for (const xml of instrumentDownload.xmlFiles) {
    const source = await openB3XmlWithIncrementalHash(xml);
    const dataset = await parseB3InstrumentXmlStream(source.stream, {
      sourceId: "B3_PUBLIC_FILES", sourceUrl: instrumentDownload.officialDownloadUrl, sourceFile: xml.filename, extractedAtUtc: collectedAtUtc,
      sourceAsOf: input.asOf, sourceHashSha256: xml.sha256,
    }, { includeRow: row => row.family === "DI1" });
    dataset.lineage.sourceHashSha256 = source.finalizeHash();
    instrumentDatasets.push(dataset);
  }
  const market = buildB3MarketDataset(priceDatasets.flatMap(dataset => dataset.dataframe), instrumentDatasets.flatMap(dataset => dataset.instrumentMasterDataframe));
  const curve = buildDiFutureCurveVertices(market, "B3_TRADING_2026");
  const csvBytes = Buffer.from(`\ufeff${dataframeToCsv(curve.dataframe as Array<Record<string, unknown>>)}`, "utf8");
  const prefix = `b3/curves/di1/${input.asOf}/${collectedAtUtc.replace(/[:.]/g, "-")}`;
  const csvStored = await storagePut(`${prefix}/di1-market-vertices.csv`, csvBytes, "text/csv; charset=utf-8");
  const manifest = {
    schemaVersion: "1.0.0", curveType: "B3_DI1_MARKET_VERTICES", generatedAtUtc: collectedAtUtc, requestedAsOf: input.asOf,
    marketAssociationStatus: market.associationStatus, calendarId: curve.calendarId, curveStatus: curve.status, records: curve.dataframe.length,
    sourceReports: [
      { reportType: priceDownload.reportType, sourceAsOf: priceDownload.sourceAsOf, officialDownloadUrl: priceDownload.officialDownloadUrl, outerArchive: priceDownload.outerArchive, innerArchive: priceDownload.innerArchive, xmlFiles: priceDownload.xmlFiles.map(xml => ({ filename: xml.filename, bytes: xml.bytes, sha256: xml.sha256 })) },
      { reportType: instrumentDownload.reportType, sourceAsOf: instrumentDownload.sourceAsOf, officialDownloadUrl: instrumentDownload.officialDownloadUrl, outerArchive: instrumentDownload.outerArchive, innerArchive: instrumentDownload.innerArchive, xmlFiles: instrumentDownload.xmlFiles.map(xml => ({ filename: xml.filename, bytes: xml.bytes, sha256: xml.sha256 })) },
    ],
    curve: { issues: curve.issues, limitations: curve.limitations, columns: curve.dataframe.length ? Object.keys(curve.dataframe[0]!) : [] },
    csv: { storageKey: csvStored.key, storageUrl: csvStored.url, bytes: csvBytes.length, sha256: sha256Text(csvBytes) },
  };
  const manifestStored = await storagePut(`${prefix}/di1-market-vertices.manifest.json`, JSON.stringify(manifest, null, 2), "application/json");
  return { collectedAtUtc, storageMode: "object_storage_without_database" as const, marketAssociationStatus: market.associationStatus, curve: { ...curve, csv: manifest.csv, manifest: { storageKey: manifestStored.key, storageUrl: manifestStored.url } } };
}

async function persistOfficialManualDataset(input: {
  sourceId: "BCB_PTAX" | "BCB_SGS_11_SELIC" | "BCB_SGS_1178_SELIC_AA252" | "IBGE_IPCA" | "ANBIMA_ETTJ" | "FGV_IGPM";
  raw: unknown;
  rawFilename: string;
  rawContentType: string;
  dataframe: Array<Record<string, unknown>>;
  lineage: { sourceUrl: string; sourceFile: string; extractedAtUtc: string; sourceAsOf: string | null; sourceHashSha256: string | null; parserVersion: string; validationStatus: "valid" | "invalid" | "warning" };
}) {
  const sourceAsOf = input.lineage.sourceAsOf ?? "sem-data-base";
  const prefix = `official-manual/${input.sourceId.toLowerCase()}/${sourceAsOf}/${input.lineage.extractedAtUtc.replace(/[:.]/g, "-")}`;
  const rawBytes = typeof input.raw === "string" ? Buffer.from(input.raw, "utf8") : Buffer.from(JSON.stringify(input.raw, null, 2), "utf8");
  const csvBytes = Buffer.from(`\ufeff${dataframeToCsv(input.dataframe)}`, "utf8");
  const [rawStored, csvStored] = await Promise.all([
    storagePut(`${prefix}/${input.rawFilename}`, rawBytes, input.rawContentType),
    storagePut(`${prefix}/${input.lineage.sourceFile}.csv`, csvBytes, "text/csv; charset=utf-8"),
  ]);
  const manifest = {
    schemaVersion: "1.0.0",
    sourceId: input.sourceId,
    lineage: input.lineage,
    collectedAtUtc: input.lineage.extractedAtUtc,
    records: input.dataframe.length,
    columns: input.dataframe.length ? Object.keys(input.dataframe[0]!) : [],
    raw: { bytes: rawBytes.length, sha256: sha256Text(rawBytes), storageKey: rawStored.key, storageUrl: rawStored.url },
    csv: { bytes: csvBytes.length, sha256: sha256Text(csvBytes), storageKey: csvStored.key, storageUrl: csvStored.url },
  };
  const manifestStored = await storagePut(`${prefix}/manifest.json`, JSON.stringify(manifest, null, 2), "application/json");
  return { ...manifest, manifest: { storageKey: manifestStored.key, storageUrl: manifestStored.url }, storageMode: "object_storage_without_database" as const };
}

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  product: router({
    runtime: publicProcedure.query(() => ({
      persistence: "dataframes_session_object_storage" as const,
      authentication: "inactive_not_required" as const,
      database: "disabled_without_fallback" as const,
    })),
  }),

  marketData: router({
    /**
     * Recupera a cotação diária do dólar no recurso PTAX oficialmente documentado.
     * O resultado é efêmero e inclui o payload normalizado e a linhagem da consulta.
     */
    ptaxUsdDay: publicProcedure
      .input(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
      .query(({ input }) => fetchPtaxUsdDay(input.date)),
    bcbSelicSgs: publicProcedure
      .input(z.object({ startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
      .query(({ input }) => fetchBcbSelicSgs(input)),
    selicOverAccumulated: publicProcedure
      .input(z.object({ startDate: z.string().regex(/^2026-\d{2}-\d{2}$/), endDate: z.string().regex(/^2026-\d{2}-\d{2}$/) }))
      .query(async ({ input }) => calculateSgs11OverAccumulation({ ...input, dataset: await fetchBcbSelicSgs(input) })),
    bcbSelicAnnualized252: publicProcedure
      .input(z.object({ startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
      .query(({ input }) => fetchBcbSelicAnnualized252(input)),
    ipcaMonthly: publicProcedure
      .input(z.object({ period: z.string().regex(/^\d{6}$/) }))
      .query(({ input }) => fetchIbgeIpcaMonthlyVariation(input.period)),
    ipcaAccumulated: publicProcedure
      .input(z.object({ startPeriod: z.string().regex(/^\d{6}$/), endPeriod: z.string().regex(/^\d{6}$/), localityId: z.string().min(1).default("1") }))
      .query(async ({ input }) => {
        const [base, final] = await Promise.all([fetchIbgeIpcaIndexNumber(previousMonthlyPeriod(input.startPeriod)), fetchIbgeIpcaIndexNumber(input.endPeriod)]);
        const datasets = [base, final] as IpcaIndexOfficialDataset[];
        return calculateIpcaAccumulated({ ...input, datasets });
      }),
    igpmPublishedTable: publicProcedure
      .input(z.object({ sourceUrl: z.string().url(), year: z.number().int() }))
      .query(({ input }) => fetchFgvIgpmPublishedTable(input)),
    anbimaEttj: publicProcedure.query(() => fetchAnbimaEttj()),
    b3RealSnapshot: publicProcedure.query(() => B3_REAL_SNAPSHOT),
    officialInstrumentMaster: publicProcedure.query(() => OFFICIAL_INSTRUMENT_MASTER),
    businessCalendar: publicProcedure
      .input(z.object({
        calendarId: z.enum(["B3_TRADING_2026", "ANBIMA_BANKING_2026"]),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        offsetBusinessDays: z.number().int().optional(),
      }))
      .query(({ input }) => {
        const lineage = BUSINESS_CALENDARS[input.calendarId];
        return {
          lineage,
          isBusinessDay: isBusinessDay(input.date, input.calendarId),
          settlementD1: settlementDateD1(input.date, input.calendarId),
          shiftedDate: input.offsetBusinessDays === undefined ? null : addBusinessDays(input.date, input.offsetBusinessDays, input.calendarId),
          businessDaysToEnd: input.endDate ? businessDaysBetween(input.date, input.endDate, input.calendarId) : null,
        };
      }),
    collectB3Reports: publicProcedure
      .input(z.object({
        asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        reportTypes: z.array(z.enum(["BVBG.086.01", "BVBG.187.01", "BVBG.028.02"])).min(1).max(3),
        normalize: z.boolean().default(false),
        persistRaw: z.boolean().default(false),
        collectionMode: z.enum(["automatic", "manual"]).default("manual"),
      }))
      .mutation(async ({ input }) => {
        const collectedAtUtc = new Date().toISOString();
        const downloadPolicy = input.collectionMode === "automatic"
          ? { timeoutMs: 25_000, maxAttempts: 1, retryDelayMs: 0 }
          : { timeoutMs: B3_BULLETIN_DOWNLOAD_TIMEOUT_MS, maxAttempts: 2, retryDelayMs: 750 };
        const reports = [];
        for (const reportType of input.reportTypes) {
          try {
            const download = reportType === "BVBG.028.02"
              ? await collectB3OfficialReport({ reportType, asOf: input.asOf, persistRaw: input.persistRaw, ...downloadPolicy })
              : await collectB3OfficialPriceReport({ reportType, asOf: input.asOf, persistRaw: input.persistRaw, ...downloadPolicy });
            const normalizations = [];
            if (input.normalize) {
              for (const xml of download.xmlFiles) {
                normalizations.push(reportType === "BVBG.028.02"
                  ? await normalizeCollectedB3InstrumentXml({ asOf: input.asOf, officialDownloadUrl: download.officialDownloadUrl, collectedAtUtc, xml })
                  : await normalizeCollectedB3PriceXml({ reportType, asOf: input.asOf, officialDownloadUrl: download.officialDownloadUrl, collectedAtUtc, xml }));
              }
            }
            reports.push({
              availability: "available" as const,
              availabilityReason: null,
              reportType: download.reportType,
              sourceAsOf: download.sourceAsOf,
              officialDownloadUrl: download.officialDownloadUrl,
              validationStatus: download.validationStatus,
              attempts: download.attempts,
              outerArchive: download.outerArchive,
              innerArchive: download.innerArchive,
              xmlFiles: download.xmlFiles.map(({ filename, bytes, sha256 }) => ({ filename, bytes, sha256 })),
              normalizations,
            });
          } catch (error) {
            reports.push({
              availability: "unavailable" as const,
              availabilityReason: b3AvailabilityReason(error),
              reportType,
              sourceAsOf: input.asOf,
              officialDownloadUrl: null,
              validationStatus: null,
              attempts: downloadPolicy.maxAttempts,
              outerArchive: null,
              innerArchive: null,
              xmlFiles: [],
              normalizations: [],
            });
          }
        }
        return {
          collectedAtUtc,
          storageMode: "object_storage_without_database" as const,
          availability: reports.every(report => report.availability === "available") ? "available" as const : reports.some(report => report.availability === "available") ? "partial" as const : "unavailable" as const,
          reports,
        };
      }),
    collectB3DiFutureCurve: publicProcedure
      .input(z.object({ asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
      .mutation(({ input }) => collectAndBuildB3DiFutureCurve(input)),
    readB3NormalizedObservations: publicProcedure
      .input(z.object({
        priceManifestStorageKey: z.string().min(1),
        instrumentManifestStorageKey: z.string().min(1),
        priceReportType: z.enum(["BVBG.086.01", "BVBG.187.01"]),
        family: z.enum(["DI1", "DOL", "WDO", "DDI", "BGI", "ICF", "CNL", "ETH", "CCM", "GLD", "SOY", "SJC"]),
        limit: z.number().int().min(1).max(200).default(100),
      }))
      .query(async ({ input }) => {
        const [price, instrument] = await Promise.all([
          readB3NormalizedManifest(input.priceManifestStorageKey),
          readB3NormalizedManifest(input.instrumentManifestStorageKey),
        ]);
        if (price.manifest.source.sourceAsOf !== instrument.manifest.source.sourceAsOf) throw new Error("Seleção B3 bloqueada: os manifestos de preço e cadastro possuem datas-base divergentes.");
        const result = buildNormalizedB3ObservationCandidates({ priceCsv: price.csvText, instrumentCsv: instrument.csvText, family: input.family, limit: input.limit });
        return {
          family: input.family,
          associationStatus: result.associationStatus,
          candidates: result.candidates,
          issues: result.issues,
          priceSource: { ...price.manifest.source, reportType: input.priceReportType, normalizedCsvStorageKey: price.manifest.csv.storageKey, normalizedCsvSha256: price.manifest.csv.sha256, normalizedManifestStorageKey: price.manifestStorageKey },
          instrumentSource: { ...instrument.manifest.source, normalizedCsvStorageKey: instrument.manifest.csv.storageKey, normalizedCsvSha256: instrument.manifest.csv.sha256, normalizedManifestStorageKey: instrument.manifestStorageKey },
        };
      }),
    collectOfficialDataset: publicProcedure
      .input(z.discriminatedUnion("sourceId", [
        z.object({ sourceId: z.literal("BCB_PTAX"), asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }),
        z.object({ sourceId: z.literal("BCB_SGS_11_SELIC"), startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }),
        z.object({ sourceId: z.literal("BCB_SGS_1178_SELIC_AA252"), startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }),
        z.object({ sourceId: z.literal("IBGE_IPCA"), period: z.string().regex(/^\d{6}$/) }),
        z.object({ sourceId: z.literal("ANBIMA_ETTJ") }),
        z.object({ sourceId: z.literal("FGV_IGPM"), sourceUrl: z.string().url(), year: z.number().int().min(1900).max(9999) }),
      ]))
      .mutation(async ({ input }) => {
        if (input.sourceId === "BCB_PTAX") {
          const dataset = await fetchPtaxUsdDay(input.asOf);
          return persistOfficialManualDataset({ sourceId: input.sourceId, raw: dataset.raw, rawFilename: "CotacaoDolarDia.raw.json", rawContentType: "application/json", dataframe: dataset.dataframe as Array<Record<string, unknown>>, lineage: dataset.lineage });
        }
        if (input.sourceId === "BCB_SGS_11_SELIC") {
          const dataset = await fetchBcbSelicSgs({ startDate: input.startDate, endDate: input.endDate });
          return persistOfficialManualDataset({ sourceId: input.sourceId, raw: dataset.raw, rawFilename: "bcdata.sgs.11.raw.json", rawContentType: "application/json", dataframe: dataset.dataframe as Array<Record<string, unknown>>, lineage: dataset.lineage });
        }
        if (input.sourceId === "BCB_SGS_1178_SELIC_AA252") {
          const dataset = await fetchBcbSelicAnnualized252({ startDate: input.startDate, endDate: input.endDate });
          return persistOfficialManualDataset({ sourceId: input.sourceId, raw: dataset.raw, rawFilename: "bcdata.sgs.1178.raw.json", rawContentType: "application/json", dataframe: dataset.dataframe as Array<Record<string, unknown>>, lineage: dataset.lineage });
        }
        if (input.sourceId === "IBGE_IPCA") {
          const dataset = await fetchIbgeIpcaMonthlyVariation(input.period);
          return persistOfficialManualDataset({ sourceId: input.sourceId, raw: { metadata: dataset.rawMetadata, data: dataset.rawData }, rawFilename: "sidra-1737-63.raw.json", rawContentType: "application/json", dataframe: dataset.dataframe as Array<Record<string, unknown>>, lineage: dataset.lineage });
        }
        if (input.sourceId === "ANBIMA_ETTJ") {
          const dataset = await fetchAnbimaEttj();
          return persistOfficialManualDataset({ sourceId: input.sourceId, raw: dataset.rawHtml, rawFilename: "CZ.asp.raw.html", rawContentType: "text/html; charset=utf-8", dataframe: dataset.dataframe as Array<Record<string, unknown>>, lineage: dataset.lineage });
        }
        const dataset = await fetchFgvIgpmPublishedTable({ sourceUrl: input.sourceUrl, year: input.year });
        return persistOfficialManualDataset({ sourceId: input.sourceId, raw: dataset.rawHtml, rawFilename: `igpm-${input.year}.raw.html`, rawContentType: "text/html; charset=utf-8", dataframe: dataset.dataframe as Array<Record<string, unknown>>, lineage: dataset.lineage });
      }),
  }),

  workspace: router({
    createScenarioBundle: publicProcedure
      .input(scenarioBundleInputSchema)
      .mutation(({ input }) =>
        createScenarioBundle({
          bundleId: input.bundle_id,
          exportedAtUtc: input.exported_at_utc,
          dataframes: input.dataframes,
        }),
      ),
    importScenarioBundle: publicProcedure
      .input(z.object({ serializedBundle: z.string().min(1) }))
      .mutation(({ input }) => importScenarioBundle(input.serializedBundle)),
    exportParquetDataFrame: publicProcedure
      .input(z.object({ rows: z.array(z.record(z.string(), z.unknown())) }))
      .mutation(async ({ input }) => {
        const artifact = await createParquetDataFrameArtifact(input.rows);
        return { manifest: artifact.manifest, bytesBase64: artifact.bytes.toString("base64") };
      }),
    importParquetDataFrame: publicProcedure
      .input(z.object({ bytesBase64: z.string().min(1), sha256: z.string().regex(/^[a-f0-9]{64}$/) }))
      .mutation(({ input }) => readParquetDataFrameArtifact(Buffer.from(input.bytesBase64, "base64"), input.sha256)),
    exportParquetScenario: publicProcedure
      .input(scenarioBundleInputSchema)
      .mutation(async ({ input }) => {
        const artifact = await createParquetScenarioArtifact({ bundleId: input.bundle_id, exportedAtUtc: input.exported_at_utc, dataframes: input.dataframes });
        return { manifest: artifact.manifest, bytesBase64: artifact.bytes.toString("base64") };
      }),
    importParquetScenario: publicProcedure
      .input(z.object({
        bytesBase64: z.string().min(1),
        manifest: z.object({
          schemaVersion: z.literal("1.0.0"),
          encoding: z.literal("parquet_row_json"),
          rows: z.number().int().nonnegative(),
          sha256: z.string().regex(/^[a-f0-9]{64}$/),
          dataframeRows: z.object({
            instrument_master_dataframe: z.number().int().nonnegative(),
            exposure_dataframe: z.number().int().nonnegative(),
            hedge_dataframe: z.number().int().nonnegative(),
            scenario_dataframe: z.number().int().nonnegative(),
            calculation_dataframe: z.number().int().nonnegative(),
            lineage_dataframe: z.number().int().nonnegative(),
          }),
          scenarioBundle: z.unknown(),
        }),
      }))
      .mutation(({ input }) => readParquetScenarioArtifact(Buffer.from(input.bytesBase64, "base64"), input.manifest as ParquetScenarioManifest)),
  }),

  hedge: router({
    linearFuturesScenario: publicProcedure
      .input(z.object({
        scenarioId: z.string().min(1), instrumentLabel: z.string().min(1), economicDirection: z.enum(["BUY", "SELL"]), hedgePosition: z.enum(["LONG", "SHORT"]),
        exposureQuantity: z.number().positive(), hedgeContracts: z.number().int().nonnegative(), contractUnitQuantity: z.number().positive(), initialPrice: z.number().finite(), scenarioPrice: z.number().finite(), quotationUnit: z.string().min(1),
        dataMode: z.enum(["USER_PARAMETERIZED_SCENARIO", "B3_OBSERVED_PRICES"]),
        lineage: z.object({ sourceId: z.enum(["USER_PARAMETERIZED_SCENARIO", "B3_PUBLIC_FILES"]), sourceFile: z.string().min(1), sourceHashSha256: z.string().regex(/^[a-f0-9]{64}$/).nullable(), sourceAsOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(), createdAtUtc: z.string().datetime() }),
      }))
      .query(({ input }) => calculateLinearFuturesScenario(input)),
    diagnoseAlternatives: publicProcedure
      .input(z.object({
        exposureId: z.string().min(1), kind: z.enum(["USD_PAYABLE", "USD_RECEIVABLE", "CDI_LINKED_DEBT", "COMMODITY_PURCHASE", "COMMODITY_SALE"]),
        description: z.string().min(1), notional: z.number().positive(), currency: z.enum(["USD", "BRL"]), maturityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        commodityReference: z.enum(["BGI", "ICF", "CNL", "ETH", "CCM", "GLD", "SOY", "SJC"]).optional(), indexer: z.literal("CDI").optional(), interestSpreadPctAa: z.number().finite().optional(),
      }))
      .query(({ input }) => {
        const result = diagnoseHedgeAlternatives(input);
        return { ...result, canonicalDataframes: materializeCanonicalHedgeDataframes(result, new Date().toISOString()) };
      }),
    sizeFxFuture: publicProcedure
      .input(z.object({
        exposureUsd: z.number().positive(),
        economicDirection: z.enum(["RECEIVABLE", "PAYABLE"]),
        contract: z.enum(["DOL", "WDO"]),
        roundingPolicy: z.enum(["FLOOR", "NEAREST", "CEILING"]),
      }))
      .query(({ input }) => sizeB3FxFutureHedge(input)),
    sizeCommodityFuture: publicProcedure
      .input(z.object({
        contract: z.enum(["BGI", "ICF", "CNL", "ETH", "CCM", "GLD", "SOY", "SJC"]),
        exposureQuantity: z.number().positive(),
        exposureUnit: z.enum(["ARROBA", "SACA_60KG", "METRIC_TON", "CUBIC_METER", "TROY_OUNCE"]),
        roundingPolicy: z.enum(["FLOOR", "NEAREST", "CEILING"]),
      }))
      .query(({ input }) => sizeB3CommodityFutureHedge(input)),
    sizeCommodityOption: publicProcedure
      .input(z.object({
        contract: z.enum(["BGI", "CCM", "SOY", "SJC"]),
        exposureQuantity: z.number().positive(),
        exposureUnit: z.enum(["ARROBA", "SACA_60KG", "METRIC_TON", "CUBIC_METER", "TROY_OUNCE"]),
        roundingPolicy: z.enum(["FLOOR", "NEAREST", "CEILING"]),
      }))
      .query(({ input }) => sizeB3CommodityOptionReference(input)),
    sizeDollarOption: publicProcedure
      .input(z.object({
        exposureUsd: z.number().positive(),
        roundingPolicy: z.enum(["FLOOR", "NEAREST", "CEILING"]),
      }))
      .query(({ input }) => sizeB3DollarOptionReference(input)),
    ndfSettlementScenario: publicProcedure
      .input(z.object({
        contractId: z.string().min(1),
        direction: z.enum(["BUY_USD", "SELL_USD"]),
        notionalUsd: z.number().positive(),
        contractedRateBrlPerUsd: z.number().positive(),
        fixingRateBrlPerUsd: z.number().positive(),
        valuationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        remainingBusinessDays: z.number().int().nonnegative(),
        preRatePctAa252: z.number().gt(-100),
        settlementCalendar: z.enum(["B3_TRADING_2026", "ANBIMA_BANKING_2026"]),
        ptaxLineage: z.object({ sourceId: z.literal("BCB_PTAX"), sourceAsOf: z.string().min(1), sourceHashSha256: z.string().nullable() }),
        ettjLineage: z.object({ sourceId: z.literal("ANBIMA_ETTJ"), sourceAsOf: z.string().min(1), sourceHashSha256: z.string().nullable() }),
      }))
      .query(({ input }) => calculateNdfSettlementScenario(input)),
    b3DollarOptionIntrinsicSettlement: publicProcedure
      .input(z.object({ optionPosition: z.enum(["LONG", "SHORT"]), optionType: z.enum(["CALL", "PUT"]), contracts: z.number().int().positive(), strikeBrlPerUsd: z.number().positive(), underlyingSettlementBrlPerUsd: z.number().positive(), underlyingSymbol: z.string().min(1), b3Lineage: z.object({ sourceId: z.literal("B3_PUBLIC_FILES"), sourceAsOf: z.string().min(1), sourceFile: z.string().min(1), sourceHashSha256: z.string().regex(/^[a-f0-9]{64}$/) }) }))
      .query(({ input }) => calculateB3DollarOptionIntrinsicSettlement(input)),
    b3DollarOptionPremiumMtmGreeks: publicProcedure
      .input(z.object({
        optionPosition: z.enum(["LONG", "SHORT"]), optionType: z.enum(["CALL", "PUT"]), contracts: z.number().int().positive(),
        strike: z.number().positive(), underlyingSettlement: z.number().positive(), observedOptionPremium: z.number().nonnegative(),
        previousOptionPremium: z.number().nonnegative().optional(),
        valuationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), calendarId: z.enum(["B3_TRADING_2026", "ANBIMA_BANKING_2026"]),
        riskFreeRateAnnual: z.number().finite(), underlyingSymbol: z.string().min(1), optionSeriesSymbol: z.string().min(1),
        premiumLineage: z.object({ sourceId: z.literal("B3_PUBLIC_FILES"), sourceAsOf: z.string().min(1), sourceFile: z.string().min(1), sourceHashSha256: z.string().regex(/^[a-f0-9]{64}$/) }),
        previousPremiumLineage: z.object({ sourceId: z.literal("B3_PUBLIC_FILES"), sourceAsOf: z.string().min(1), sourceFile: z.string().min(1), sourceHashSha256: z.string().regex(/^[a-f0-9]{64}$/) }).optional(),
        rateLineage: z.object({ sourceId: z.enum(["B3_DI1_CURVE", "BCB_SELIC"]), sourceAsOf: z.string().min(1), sourceHashSha256: z.string().regex(/^[a-f0-9]{64}$/).nullable() }),
      }))
      .query(({ input }) => calculateB3OptionPremiumMtmGreeks({ ...input, contractMultiplier: 50_000, unitLabel: "USD" })),
    b3CornOptionIntrinsicSettlement: publicProcedure
      .input(z.object({ optionPosition: z.enum(["LONG", "SHORT"]), optionType: z.enum(["CALL", "PUT"]), contracts: z.number().int().positive(), strikeBrlPerSack: z.number().positive(), underlyingSettlementBrlPerSack: z.number().positive(), underlyingSymbol: z.string().min(1), b3Lineage: z.object({ sourceId: z.literal("B3_PUBLIC_FILES"), sourceAsOf: z.string().min(1), sourceFile: z.string().min(1), sourceHashSha256: z.string().regex(/^[a-f0-9]{64}$/) }) }))
      .query(({ input }) => calculateB3CornOptionIntrinsicSettlement(input)),
    b3CattleOptionIntrinsicSettlement: publicProcedure
      .input(z.object({ optionPosition: z.enum(["LONG", "SHORT"]), optionType: z.enum(["CALL", "PUT"]), contracts: z.number().int().positive(), strikeBrlPerArroba: z.number().positive(), underlyingSettlementBrlPerArroba: z.number().positive(), underlyingSymbol: z.string().min(1), b3Lineage: z.object({ sourceId: z.literal("B3_PUBLIC_FILES"), sourceAsOf: z.string().min(1), sourceFile: z.string().min(1), sourceHashSha256: z.string().regex(/^[a-f0-9]{64}$/) }) }))
      .query(({ input }) => calculateB3CattleOptionIntrinsicSettlement(input)),
    b3SoyOptionIntrinsicSettlement: publicProcedure
      .input(z.object({ optionPosition: z.enum(["LONG", "SHORT"]), optionType: z.enum(["CALL", "PUT"]), contracts: z.number().int().positive(), strikeUsdPerTon: z.number().positive(), underlyingSettlementUsdPerTon: z.number().positive(), underlyingSymbol: z.string().min(1), b3Lineage: z.object({ sourceId: z.literal("B3_PUBLIC_FILES"), sourceAsOf: z.string().min(1), sourceFile: z.string().min(1), sourceHashSha256: z.string().regex(/^[a-f0-9]{64}$/) }) }))
      .query(({ input }) => calculateB3SoyOptionIntrinsicSettlement(input)),
    b3SjcOptionIntrinsicSettlement: publicProcedure
      .input(z.object({ optionPosition: z.enum(["LONG", "SHORT"]), optionType: z.enum(["CALL", "PUT"]), contracts: z.number().int().positive(), strikeUsdPerSack: z.number().positive(), underlyingSettlementUsdPerSack: z.number().positive(), underlyingSymbol: z.string().min(1), b3Lineage: z.object({ sourceId: z.literal("B3_PUBLIC_FILES"), sourceAsOf: z.string().min(1), sourceFile: z.string().min(1), sourceHashSha256: z.string().regex(/^[a-f0-9]{64}$/) }) }))
      .query(({ input }) => calculateB3SjcOptionIntrinsicSettlement(input)),
    b3FxFutureDailySettlement: publicProcedure
      .input(z.object({ contract: z.enum(["DOL", "WDO"]), position: z.enum(["LONG_USD", "SHORT_USD"]), contracts: z.number().int().positive(), previousSettlementQuoteBrlPerUsd1000: z.number().finite(), currentSettlementQuoteBrlPerUsd1000: z.number().finite(), previousB3Lineage: z.object({ sourceId: z.literal("B3_PUBLIC_FILES"), sourceAsOf: z.string().min(1), sourceFile: z.string().min(1), sourceHashSha256: z.string().regex(/^[a-f0-9]{64}$/) }), currentB3Lineage: z.object({ sourceId: z.literal("B3_PUBLIC_FILES"), sourceAsOf: z.string().min(1), sourceFile: z.string().min(1), sourceHashSha256: z.string().regex(/^[a-f0-9]{64}$/) }) }))
      .query(({ input }) => calculateB3FxFutureDailySettlement(input)),
    di1VariationMargin: publicProcedure
      .input(z.object({
        position: z.enum(["PU_BUYER", "PU_SELLER"]), contracts: z.number().int().positive(), positionState: z.enum(["INITIATED_TODAY", "OUTSTANDING_FROM_PREVIOUS_DAY"]), settlementPuToday: z.number().positive(),
        tradeRatePct: z.number().optional(), businessDaysToDayBeforeExpiration: z.number().int().nonnegative().optional(), settlementPuPreviousDay: z.number().positive().optional(), diRatesPctForCorrection: z.array(z.number().gt(-100)).min(1).optional(),
        settlementLineage: z.object({ sourceId: z.enum(["B3_PUBLIC_FILES", "B3_CONTRACT"]), sourceAsOf: z.string().nullable(), sourceFile: z.string().min(1), sourceHashSha256: z.string().regex(/^[a-f0-9]{64}$/) }),
        previousSettlementLineage: z.object({ sourceId: z.enum(["B3_PUBLIC_FILES", "B3_CONTRACT"]), sourceAsOf: z.string().nullable(), sourceFile: z.string().min(1), sourceHashSha256: z.string().regex(/^[a-f0-9]{64}$/) }).optional(),
        diRateLineage: z.object({ sourceId: z.enum(["B3_PUBLIC_FILES", "B3_CONTRACT"]), sourceAsOf: z.string().nullable(), sourceFile: z.string().min(1), sourceHashSha256: z.string().regex(/^[a-f0-9]{64}$/) }).optional(),
      }))
      .query(({ input }) => calculateDi1VariationMargin(input)),
    bcbTraditionalFxSwapScenario: publicProcedure
      .input(z.object({ contractId: z.string().min(1), position: z.enum(["RECEIVE_FX_COUPON_PAY_SELIC", "PAY_FX_COUPON_RECEIVE_SELIC"]), notionalUsd: z.number().positive(), initialFxBrlPerUsd: z.number().positive(), finalFxBrlPerUsd: z.number().positive(), fxCouponPctAa252: z.number(), selicPctAa252: z.number(), businessDays: z.number().int().nonnegative(), bcbSwapLineage: z.object({ sourceId: z.literal("BCB_FX_SWAP"), sourceUrl: z.string().url(), extractedAtUtc: z.string().datetime() }), fxLineage: z.object({ sourceId: z.literal("BCB_PTAX"), sourceAsOf: z.string().min(1), sourceHashSha256: z.string().nullable() }), domesticRateLineage: z.object({ sourceId: z.literal("BCB_SELIC"), sourceAsOf: z.string().min(1), sourceHashSha256: z.string().nullable() }) }))
      .query(({ input }) => calculateBcbTraditionalFxSwapScenario(input)),
    hedgeEffectiveness: publicProcedure
      .input(z.object({ hedgedItemChangeBrl: z.number().finite(), hedgingInstrumentChangeBrl: z.number().finite(), hedgedItemNotionalBrl: z.number().positive(), hedgingInstrumentNotionalBrl: z.number().positive(), accountingFramework: z.enum(["IFRS9_CPC48", "IAS39_LEGACY"]), accountingPolicyReference: z.string().min(1), eligibility: z.object({ eligibleHedgingInstrument: z.boolean(), eligibleHedgedItem: z.boolean(), documentedAtInception: z.boolean(), economicRelationship: z.boolean(), creditRiskDominatesValueChanges: z.boolean(), hedgeRatioMatchesActualQuantities: z.boolean() }), lineage: z.object({ valuationAsOf: z.string().min(1), cpc48Revision: z.literal("CPC_48_REV_14"), cpc48SourceHashSha256: z.string().regex(/^[a-f0-9]{64}$/), valuationSourceIds: z.array(z.string().min(1)).min(1) }) }))
      .query(({ input }) => assessHedgeEffectiveness(input)),
    persistOtcContractEvidence: publicProcedure
      .input(z.object({ fileName: z.string().min(1).max(180), contentBase64: z.string().min(1), contentType: z.string().min(1).max(120) }))
      .mutation(async ({ input }) => {
        const content = Buffer.from(input.contentBase64, "base64");
        if (content.length === 0) throw new Error("O arquivo de evidência OTC está vazio.");
        const sourceHashSha256 = sha256Text(content);
        const safeFilename = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const stored = await storagePut(`otc/contracts/${sourceHashSha256.slice(0, 16)}_${safeFilename}`, content, input.contentType);
        return { sourceId: "USER_CONTRACT" as const, sourceUrl: stored.url, sourceFile: safeFilename, sourceHashSha256, capturedAtUtc: new Date().toISOString(), storageKey: stored.key };
      }),
    createOtcInstrumentMaster: publicProcedure
      .input(z.object({
        instrumentId: z.string().min(1), kind: z.enum(["OTC_NDF", "OTC_FX_SWAP", "OTC_RATE_SWAP"]), baseCurrency: z.string().regex(/^[A-Z]{3}$/), quoteCurrency: z.string().regex(/^[A-Z]{3}$/),
        notionalBaseCurrency: z.number().positive(), tradeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), maturityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), settlementConvention: z.string().min(1),
        terms: z.discriminatedUnion("kind", [
          z.object({ kind: z.literal("OTC_NDF"), forwardRateBrlPerUsd: z.number().positive(), fixingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), settlementDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }),
          z.object({ kind: z.literal("OTC_FX_SWAP"), domesticLegIndex: z.string().min(1), foreignLegIndex: z.string().min(1), startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }),
          z.object({ kind: z.literal("OTC_RATE_SWAP"), payerLeg: z.enum(["PAY_FIXED_RECEIVE_FLOATING", "RECEIVE_FIXED_PAY_FLOATING"]), floatingLegIndex: z.string().min(1), fixedLegConvention: z.string().min(1), paymentSchedule: z.string().min(1), startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }),
        ]),
        evidence: z.object({ sourceId: z.literal("USER_CONTRACT"), sourceUrl: z.string().nullable(), sourceFile: z.string().min(1), sourceHashSha256: z.string().regex(/^[a-f0-9]{64}$/), capturedAtUtc: z.string().datetime() }),
      }))
      .mutation(({ input }) => {
        const { terms, kind: _kind, ...base } = input;
        if (terms.kind === "OTC_NDF") {
          return createOtcInstrumentMaster({ ...base, kind: "OTC_NDF", terms: { forwardRateBrlPerUsd: terms.forwardRateBrlPerUsd, fixingDate: terms.fixingDate, settlementDate: terms.settlementDate } });
        }
        if (terms.kind === "OTC_RATE_SWAP") {
          return createOtcInstrumentMaster({ ...base, kind: "OTC_RATE_SWAP", terms: { payerLeg: terms.payerLeg, floatingLegIndex: terms.floatingLegIndex, fixedLegConvention: terms.fixedLegConvention, paymentSchedule: terms.paymentSchedule, startDate: terms.startDate, endDate: terms.endDate } });
        }
        return createOtcInstrumentMaster({ ...base, kind: "OTC_FX_SWAP", terms: { domesticLegIndex: terms.domesticLegIndex, foreignLegIndex: terms.foreignLegIndex, startDate: terms.startDate, endDate: terms.endDate } });
      }),
  }),

  risk: router({
    fxStress: publicProcedure
      .input(z.object({
        exposureUsd: z.number().positive(),
        economicDirection: z.enum(["RECEIVABLE", "PAYABLE"]),
        ptaxSale: z.number().positive(),
        fxShockPct: z.number().gt(-1),
      }))
      .query(({ input }) => calculateFxStress(input)),
    parametricVar: publicProcedure
      .input(z.object({
        exposureBrl: z.number().refine(value => value !== 0),
        dailyVolatilityPct: z.number().positive(),
        holdingPeriodBusinessDays: z.number().int().positive(),
        confidenceLevel: z.number().gt(0).lt(1),
      }))
      .query(({ input }) => calculateParametricVar(input)),
    residualRisk: publicProcedure
      .input(z.object({ grossExposureBrl: z.number().finite().refine(value => value !== 0), hedgeEquivalentExposureBrl: z.number().finite(), dailyVolatilityPct: z.number().positive(), holdingPeriodBusinessDays: z.number().int().positive(), confidenceLevel: z.number().gt(0).lt(1), lineage: z.object({ valuationAsOf: z.string().min(1), sourceIds: z.array(z.string().min(1)).min(1) }) }))
      .query(({ input }) => calculateResidualRisk(input)),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;

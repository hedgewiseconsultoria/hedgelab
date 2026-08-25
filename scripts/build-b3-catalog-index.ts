import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Transform } from "node:stream";
import { collectB3OfficialReport } from "../server/ingestion/b3OfficialDownload";
import { parseB3PriceReportXmlStream } from "../server/ingestion/b3PriceReportParser";
import { parseB3InstrumentXmlStream } from "../server/ingestion/b3InstrumentParser";
import { buildB3MarketDataset } from "../server/domain/b3MarketDataset";
import type { SupportedB3Family } from "../server/domain/dataframes";

const asOf = process.argv[2];
const outputRoot = resolve(process.env.B3_SNAPSHOT_OUTPUT_DIR ?? "b3-snapshots");
if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf ?? "")) throw new Error("Uso: build-b3-catalog-index.ts AAAA-MM-DD");

async function hashedStream(xml: { openStream?: () => Promise<NodeJS.ReadableStream> }) {
  if (!xml.openStream) throw new Error("XML sem stream");
  const raw = await xml.openStream();
  const hash = createHash("sha256");
  const transform = new Transform({ transform(chunk, _encoding, callback) { hash.update(chunk); callback(null, chunk); } });
  raw.on("error", error => transform.destroy(error));
  raw.pipe(transform);
  return { stream: transform, finish: () => hash.digest("hex") };
}

const [priceDownload, instrumentDownload] = await Promise.all([
  collectB3OfficialReport({ reportType: "BVBG.086.01", asOf, metadataOnly: false, persistRaw: false, timeoutMs: 120_000, maxAttempts: 1 }),
  collectB3OfficialReport({ reportType: "BVBG.028.02", asOf, metadataOnly: false, persistRaw: false, timeoutMs: 120_000, maxAttempts: 1 }),
]);
const priceXml = priceDownload.xmlFiles[0];
const instrumentXml = instrumentDownload.xmlFiles[0];
if (!priceXml || !instrumentXml) throw new Error("Snapshots sem XML completo para gerar índice.");
const priceSource = await hashedStream(priceXml);
const priceDataset = await parseB3PriceReportXmlStream(priceSource.stream as any, {
  sourceId: "B3_PUBLIC_FILES", sourceUrl: priceDownload.officialDownloadUrl, sourceFile: priceXml.filename,
  extractedAtUtc: new Date().toISOString(), sourceAsOf: asOf, sourceHashSha256: null, expectedReportType: "BVBG.086.01",
});
const priceHash = priceSource.finish();
priceDataset.dataframe = priceDataset.dataframe.map(row => ({ ...row, sourceHashSha256: priceHash }));
const instrumentSource = await hashedStream(instrumentXml);
const instrumentDataset = await parseB3InstrumentXmlStream(instrumentSource.stream as any, {
  sourceId: "B3_PUBLIC_FILES", sourceUrl: instrumentDownload.officialDownloadUrl, sourceFile: instrumentXml.filename,
  extractedAtUtc: new Date().toISOString(), sourceAsOf: asOf, sourceHashSha256: null,
});
const instrumentHash = instrumentSource.finish();
const market = buildB3MarketDataset(priceDataset.dataframe, instrumentDataset.instrumentMasterDataframe);
const catalog = {
  schemaVersion: "1.0.0" as const,
  asOf,
  generatedAtUtc: new Date().toISOString(),
  associationStatus: market.associationStatus,
  rows: market.dataframe.filter(row => row.instrumentType === "FUTURE" || row.instrumentType === "OPTION"),
  coverage: market.coverage,
  issues: market.issues,
  lineage: {
    price: { sourceAsOf: asOf, officialDownloadUrl: priceDownload.officialDownloadUrl, outerArchive: { filename: priceDownload.outerArchive.filename, bytes: priceDownload.outerArchive.bytes, sha256: priceDownload.outerArchive.sha256 }, xml: { sourceFile: priceXml.filename, sha256: priceHash } },
    instrument: { sourceAsOf: asOf, officialDownloadUrl: instrumentDownload.officialDownloadUrl, outerArchive: { filename: instrumentDownload.outerArchive.filename, bytes: instrumentDownload.outerArchive.bytes, sha256: instrumentDownload.outerArchive.sha256 }, xml: { sourceFile: instrumentXml.filename, sha256: instrumentHash } },
  },
};
const directory = resolve(outputRoot, asOf);
mkdirSync(directory, { recursive: true });
const bytes = Buffer.from(JSON.stringify(catalog));
writeFileSync(resolve(directory, "catalog.json"), bytes);
writeFileSync(resolve(directory, "catalog.json.sha256"), createHash("sha256").update(bytes).digest("hex"));
console.log(JSON.stringify({ asOf, rows: catalog.rows.length, bytes: bytes.length, associationStatus: catalog.associationStatus, coverage: catalog.coverage }, null, 2));

import { Readable } from "node:stream";
import { collectB3OfficialReport } from "../server/ingestion/b3OfficialDownload.ts";
import { parseB3PriceReportXmlStream } from "../server/ingestion/b3PriceReportParser.ts";
import { parseB3InstrumentXmlStream } from "../server/ingestion/b3InstrumentParser.ts";
import { buildB3MarketDataset } from "../server/domain/b3MarketDataset.ts";
import { buildDiFutureCurveVertices } from "../server/domain/diFutureCurve.ts";

const asOf = "2026-08-13";
const collectedAtUtc = new Date().toISOString();

const [priceDownload, instrumentDownload] = await Promise.all([
  collectB3OfficialReport({ reportType: "BVBG.086.01", asOf }),
  collectB3OfficialReport({ reportType: "BVBG.028.02", asOf }),
]);

const priceDatasets = await Promise.all(priceDownload.xmlFiles.map(async xml => {
  if (!xml.body || !xml.sha256) throw new Error(`Arquivo de preço sem bytes ou hash: ${xml.filename}`);
  return parseB3PriceReportXmlStream(Readable.from(xml.body), {
    sourceId: "B3_PUBLIC_FILES", sourceUrl: priceDownload.officialDownloadUrl, sourceFile: xml.filename,
    extractedAtUtc: collectedAtUtc, sourceAsOf: asOf, sourceHashSha256: xml.sha256, expectedReportType: "BVBG.086.01",
  });
}));
const instrumentDatasets = await Promise.all(instrumentDownload.xmlFiles.map(async xml => {
  if (!xml.body || !xml.sha256) throw new Error(`Arquivo de cadastro sem bytes ou hash: ${xml.filename}`);
  return parseB3InstrumentXmlStream(Readable.from(xml.body), {
    sourceId: "B3_PUBLIC_FILES", sourceUrl: instrumentDownload.officialDownloadUrl, sourceFile: xml.filename,
    extractedAtUtc: collectedAtUtc, sourceAsOf: asOf, sourceHashSha256: xml.sha256,
  });
}));

const market = buildB3MarketDataset(priceDatasets.flatMap(dataset => dataset.dataframe), instrumentDatasets.flatMap(dataset => dataset.instrumentMasterDataframe));
const curve = buildDiFutureCurveVertices(market, "B3_TRADING_2026");

console.log(JSON.stringify({
  requestedAsOf: asOf,
  source: { priceFile: priceDownload.xmlFiles.map(file => ({ filename: file.filename, sha256: file.sha256 })), instrumentFile: instrumentDownload.xmlFiles.map(file => ({ filename: file.filename, sha256: file.sha256 })) },
  marketAssociationStatus: market.associationStatus,
  di1Records: market.dataframe.filter(row => row.family === "DI1" && row.instrumentType === "FUTURE").length,
  curveStatus: curve.status,
  curvePoints: curve.dataframe.length,
  firstPoints: curve.dataframe.slice(0, 3),
  issueCodes: curve.issues.map(issue => issue.code),
}, null, 2));

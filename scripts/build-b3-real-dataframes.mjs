import { createReadStream, mkdirSync, writeFileSync } from "node:fs";
import { resolve, basename } from "node:path";
import { parseB3InstrumentXmlStream } from "../server/ingestion/b3InstrumentParser.ts";
import { parseB3PriceReportXmlStream } from "../server/ingestion/b3PriceReportParser.ts";
import { buildB3MarketDataset } from "../server/domain/b3MarketDataset.ts";

const sourceAsOf = process.env.B3_SOURCE_AS_OF;
if (!sourceAsOf || !/^\d{4}-\d{2}-\d{2}$/.test(sourceAsOf)) throw new Error("Defina B3_SOURCE_AS_OF no formato AAAA-MM-DD.");
const dateStamp = sourceAsOf.replaceAll("-", "").slice(2);
const outputDirectory = resolve(process.env.B3_OUTPUT_DIR ?? `/home/ubuntu/hedge-lab-data/curated/b3/${sourceAsOf}`);
const instrumentFile = process.env.B3_INSTRUMENT_FILE;
const priceReportFile = process.env.B3_PRICE_REPORT_FILE;
const simplifiedPriceReportFile = process.env.B3_SIMPLIFIED_PRICE_REPORT_FILE;

const instrumentHash = process.env.B3_INSTRUMENT_HASH;
const priceReportHash = process.env.B3_PRICE_REPORT_HASH;
const simplifiedPriceReportHash = process.env.B3_SIMPLIFIED_PRICE_REPORT_HASH;

if (!instrumentFile || !priceReportFile || !simplifiedPriceReportFile || !instrumentHash || !priceReportHash || !simplifiedPriceReportHash) {
  throw new Error("Defina B3_INSTRUMENT_FILE, B3_PRICE_REPORT_FILE e B3_SIMPLIFIED_PRICE_REPORT_FILE com XMLs oficiais reais.");
}

function toCsv(rows) {
  if (rows.length === 0) return "";
  const fields = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
  const escape = value => {
    const text = value === null || value === undefined ? "" : String(value);
    return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return [fields.join(","), ...rows.map(row => fields.map(field => escape(row[field])).join(","))].join("\n");
}

const extractionTime = new Date().toISOString();
const instrumentDataset = await parseB3InstrumentXmlStream(createReadStream(instrumentFile), {
  sourceId: "B3_PUBLIC_FILES",
  sourceUrl: `https://www.b3.com.br/pesquisapregao/download?filelist=IN${dateStamp}.zip,`,
  sourceFile: basename(instrumentFile),
  extractedAtUtc: extractionTime,
  sourceAsOf,
  sourceHashSha256: instrumentHash,
});
const price086 = await parseB3PriceReportXmlStream(createReadStream(priceReportFile), {
  sourceId: "B3_PUBLIC_FILES",
  sourceUrl: `https://www.b3.com.br/pesquisapregao/download?filelist=PR${dateStamp}.zip,`,
  sourceFile: basename(priceReportFile),
  extractedAtUtc: extractionTime,
  sourceAsOf,
  sourceHashSha256: priceReportHash,
  expectedReportType: "BVBG.086.01",
});
const price187 = await parseB3PriceReportXmlStream(createReadStream(simplifiedPriceReportFile), {
  sourceId: "B3_PUBLIC_FILES",
  sourceUrl: `https://www.b3.com.br/pesquisapregao/download?filelist=SPRD${dateStamp}.zip,`,
  sourceFile: basename(simplifiedPriceReportFile),
  extractedAtUtc: extractionTime,
  sourceAsOf,
  sourceHashSha256: simplifiedPriceReportHash,
  expectedReportType: "BVBG.187.01",
});
const market086 = buildB3MarketDataset(price086.dataframe, instrumentDataset.instrumentMasterDataframe);
const market187 = buildB3MarketDataset(price187.dataframe, instrumentDataset.instrumentMasterDataframe);

mkdirSync(outputDirectory, { recursive: true });
writeFileSync(resolve(outputDirectory, `instrument_master_${dateStamp}.csv`), `\ufeff${toCsv(instrumentDataset.instrumentMasterDataframe)}`);
writeFileSync(resolve(outputDirectory, `price_dataframe_bvbg086_${dateStamp}.csv`), `\ufeff${toCsv(price086.dataframe)}`);
writeFileSync(resolve(outputDirectory, `price_dataframe_bvbg187_${dateStamp}.csv`), `\ufeff${toCsv(price187.dataframe)}`);
writeFileSync(resolve(outputDirectory, `market_associated_bvbg086_${dateStamp}.csv`), `\ufeff${toCsv(market086.dataframe)}`);
writeFileSync(resolve(outputDirectory, `market_associated_bvbg187_${dateStamp}.csv`), `\ufeff${toCsv(market187.dataframe)}`);
writeFileSync(resolve(outputDirectory, "manifest.json"), JSON.stringify({
  generatedAtUtc: extractionTime,
  sourceFiles: { instrument: instrumentDataset.lineage, price086: price086.lineage, price187: price187.lineage },
  observedFields: { bvbg086: price086.observedFields, bvbg187: price187.observedFields },
  coverage: { instrument: instrumentDataset.coverage, bvbg086: market086.coverage, bvbg187: market187.coverage },
  issues: { instrument: instrumentDataset.issues, price086: price086.issues, price187: price187.issues, market086: market086.issues, market187: market187.issues },
  recordCounts: { instrumentMaster: instrumentDataset.instrumentMasterDataframe.length, price086: price086.dataframe.length, price187: price187.dataframe.length, market086: market086.dataframe.length, market187: market187.dataframe.length },
  association: { bvbg086: market086.associationStatus, bvbg187: market187.associationStatus },
}, null, 2));
console.log(JSON.stringify({ outputDirectory, recordCounts: { instrumentMaster: instrumentDataset.instrumentMasterDataframe.length, price086: price086.dataframe.length, price187: price187.dataframe.length, market086: market086.dataframe.length, market187: market187.dataframe.length }, association: { bvbg086: market086.associationStatus, bvbg187: market187.associationStatus }, coverage086: market086.coverage, coverage187: market187.coverage }, null, 2));

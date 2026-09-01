import { createReadStream, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseB3InstrumentXmlStream } from "../server/ingestion/b3InstrumentParser";
import { parseB3PriceReportXmlStream } from "../server/ingestion/b3PriceReportParser";

const base = "/home/ubuntu/b3-revalidation";
const asOf = "2026-08-17";
const sourceUrl = "https://www.b3.com.br/pesquisapregao/download?filelist=PR260817.zip,SPRD260817.zip,IN260817.zip,";
const priceFile = resolve(base, "price-2026-08-17.xml");
const simplifiedFile = resolve(base, "simplified-2026-08-17.xml");
const instrumentFile = resolve(base, "instrument-2026-08-17.xml");
const extractedAtUtc = new Date().toISOString();
const families = ["DI1", "DOL", "WDO", "BGI", "CCM", "SOY", "SJC"];

function familyCounts(rows: Array<{ symbol: string | null }>) {
  return Object.fromEntries(families.map(family => [family, rows.filter(row => typeof row.symbol === "string" && row.symbol.startsWith(family)).length]));
}

function instrumentTypeCounts(rows: Array<{ family: string; instrumentType: string }>) {
  return Object.fromEntries(families.map(family => [family, Object.fromEntries(["FUTURE", "OPTION", "OTHER"].map(type => [type, rows.filter(row => row.family === family && row.instrumentType === type).length]))]));
}

const [price, simplified, instruments] = await Promise.all([
  parseB3PriceReportXmlStream(createReadStream(priceFile), { sourceId: "B3_PUBLIC_FILES", sourceUrl, sourceFile: "price-2026-08-17.xml", extractedAtUtc, sourceAsOf: asOf, sourceHashSha256: "c4fc55fcc6a56f23f3830b95ae5b6622dbdc53f6badf1b211c50dfccf7f44408", expectedReportType: "BVBG.086.01" }),
  parseB3PriceReportXmlStream(createReadStream(simplifiedFile), { sourceId: "B3_PUBLIC_FILES", sourceUrl, sourceFile: "simplified-2026-08-17.xml", extractedAtUtc, sourceAsOf: asOf, sourceHashSha256: "d800ffd848112c550b84b1d41288eb4af88794552bd68c4d297639334784aa2d", expectedReportType: "BVBG.187.01" }),
  parseB3InstrumentXmlStream(createReadStream(instrumentFile), { sourceId: "B3_PUBLIC_FILES", sourceUrl, sourceFile: "instrument-2026-08-17.xml", extractedAtUtc, sourceAsOf: asOf, sourceHashSha256: "d86eaa2680f41c1755e4526bb43260f280c54affa6dbead7ac536970fc642f52" }),
]);

const summary = {
  asOf,
  sourceUrl,
  generatedAtUtc: extractedAtUtc,
  price: { header: price.header, records: price.dataframe.length, familyCounts: familyCounts(price.dataframe), lineage: price.lineage },
  simplified: { header: simplified.header, records: simplified.dataframe.length, familyCounts: familyCounts(simplified.dataframe), lineage: simplified.lineage },
  instruments: { records: instruments.dataframe.length, familyCounts: familyCounts(instruments.dataframe), instrumentTypeCounts: instrumentTypeCounts(instruments.dataframe), coverage: instruments.coverage, lineage: instruments.lineage },
};

writeFileSync(resolve(base, "summary-2026-08-17.json"), `${JSON.stringify(summary, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { collectB3OfficialPriceReport } from "../server/ingestion/b3OfficialDownload.ts";

const asOf = process.env.B3_AS_OF;
if (!asOf) throw new Error("Defina B3_AS_OF no formato AAAA-MM-DD.");
const outputDirectory = resolve(process.env.B3_COLLECTION_OUTPUT_DIR ?? `/home/ubuntu/hedge-lab-data/raw/b3/${asOf}`);
const persistRaw = process.env.B3_PERSIST_RAW !== "false";
const reports = await Promise.all(["BVBG.086.01", "BVBG.187.01"].map(reportType => collectB3OfficialPriceReport({ reportType, asOf, persistRaw })));
mkdirSync(outputDirectory, { recursive: true });
writeFileSync(resolve(outputDirectory, "collection_manifest.json"), JSON.stringify(reports.map(({ xmlFiles, ...report }) => ({ ...report, xmlFiles: xmlFiles.map(({ body, ...xml }) => xml) })), null, 2));
console.log(JSON.stringify({ asOf, outputDirectory, persistRaw, reports: reports.map(report => ({ reportType: report.reportType, outerArchive: report.outerArchive, xmlFiles: report.xmlFiles.map(file => ({ filename: file.filename, bytes: file.bytes, sha256: file.sha256 })) })) }, null, 2));

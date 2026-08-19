import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { collectB3OfficialReport } from "../server/ingestion/b3OfficialDownload.ts";

const asOf = process.env.B3_AS_OF;
if (!asOf) throw new Error("Defina B3_AS_OF no formato AAAA-MM-DD.");
const outputDirectory = resolve(process.env.B3_COLLECTION_OUTPUT_DIR ?? `/home/ubuntu/hedge-lab-data/raw/b3/${asOf}`);
const persistRaw = process.env.B3_PERSIST_RAW !== "false";
const reportTypes = ["BVBG.028.02", "BVBG.086.01", "BVBG.187.01"];
const results = [];
for (const reportType of reportTypes) {
  try {
    results.push({ status: "fulfilled", value: await collectB3OfficialReport({ reportType, asOf, persistRaw, metadataOnly: reportType === "BVBG.028.02" }) });
  } catch (error) {
    results.push({ status: "rejected", reason: error });
  }
}
mkdirSync(outputDirectory, { recursive: true });
const manifest = results.map((result, index) => result.status === "fulfilled"
  ? { reportType: reportTypes[index], status: "fulfilled", value: { ...result.value, xmlFiles: result.value.xmlFiles.map(({ body, ...file }) => file) } }
  : { reportType: reportTypes[index], status: "rejected", reason: result.reason instanceof Error ? result.reason.message : String(result.reason) });
writeFileSync(resolve(outputDirectory, "collection_all_reports_manifest.json"), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify(manifest, null, 2));

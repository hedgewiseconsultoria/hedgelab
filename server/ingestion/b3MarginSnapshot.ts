import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import AdmZip from "adm-zip";
import type { B3TheoreticalMarginRow } from "./b3SnapshotCache";

function parseNumber(value: string | undefined) {
  const normalized = (value ?? "").trim().replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return normalized && Number.isFinite(parsed) ? parsed : null;
}

export function parseB3TheoreticalMarginCsv(text: string, sourceFile: string, sourceHashSha256: string): B3TheoreticalMarginRow[] {
  const rows: B3TheoreticalMarginRow[] = [];
  for (const line of text.replace(/^\ufeff/, "").split(/\r?\n/)) {
    const fields = line.split(";");
    if (fields[0] !== "INSTRUMENT") continue;
    const instrumentId = fields[1]?.trim();
    const symbol = fields[5]?.trim();
    const marginValue = parseNumber(fields[4]);
    if (!instrumentId || !symbol || marginValue === null || marginValue < 0) continue;
    rows.push({ instrumentId, symbol, marginValue, clearingSystem: fields[3]?.trim() || null, sourceFile, sourceHashSha256 });
  }
  return rows;
}

export function extractB3MarginCsv(outerBuffer: Buffer, archiveFilename: string) {
  const outer = new AdmZip(outerBuffer);
  const inner = outer.getEntry(archiveFilename);
  if (!inner) throw new Error(`O pacote externo de margem não contém o ZIP interno ${archiveFilename}.`);
  const innerZip = new AdmZip(inner.getData());
  const csvEntry = innerZip.getEntries().find(entry => entry.entryName.toLowerCase().endsWith(".csv"));
  if (!csvEntry) throw new Error(`O ZIP interno de margem ${archiveFilename} não contém CSV.`);
  return { csvFilename: csvEntry.entryName, text: csvEntry.getData().toString("utf8") };
}

export async function readLocalB3MarginRows(input: { root: string; asOf: string; archiveFilename: string }) {
  try {
    const archivePath = resolve(input.root, `b3-snapshots/${input.asOf}/B3_MARGIN_MAXIMUM/${input.archiveFilename}`);
    const hashPath = `${archivePath}.sha256`;
    const buffer = await readFile(archivePath);
    const expectedHash = (await readFile(hashPath, "utf8")).trim().split(/\s+/)[0];
    const actualHash = createHash("sha256").update(buffer).digest("hex");
    if (!expectedHash || expectedHash !== actualHash || buffer.subarray(0, 2).toString("utf8") !== "PK") return null;
    const extracted = extractB3MarginCsv(buffer, input.archiveFilename);
    return { rows: parseB3TheoreticalMarginCsv(extracted.text, extracted.csvFilename, actualHash), archiveFilename: input.archiveFilename, archiveHashSha256: actualHash, csvFilename: extracted.csvFilename };
  } catch {
    return null;
  }
}

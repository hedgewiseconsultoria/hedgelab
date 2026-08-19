import { createHash } from "node:crypto";
import type { DataLineage } from "../domain/dataframes";
import type { FetchLike } from "./bcbPtax";

const ANBIMA_ETTJ_URL = "https://www.anbima.com.br/informacoes/est-termo/CZ.asp";

export type AnbimaEttjRow = {
  asOf: string;
  vertexBusinessDays: number;
  ettjIpcaPctAa252: number | null;
  ettjPrePctAa252: number | null;
  impliedInflationPctAa252: number | null;
  unit: "%a.a./252";
};

export type AnbimaEttjDataset = {
  rawHtml: string;
  dataframe: AnbimaEttjRow[];
  lineage: DataLineage;
};

function stripHtml(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeAnbimaHtml(bytes: ArrayBuffer): string {
  const buffer = Buffer.from(bytes);
  const utf8 = buffer.toString("utf8");
  return utf8.includes("�") ? buffer.toString("latin1") : utf8;
}

function parseBrazilianDecimal(value: string): number | null {
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseAsOf(html: string): string {
  const match = stripHtml(html).match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/);
  if (!match) throw new Error("A página da ANBIMA não apresentou data de referência identificável.");
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function extractCells(rowHtml: string): string[] {
  const cells: string[] = [];
  const cellRegex = /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi;
  let match: RegExpExecArray | null;
  while ((match = cellRegex.exec(rowHtml)) !== null) cells.push(stripHtml(match[1]!));
  return cells;
}

export function parseAnbimaEttjHtml(html: string): AnbimaEttjRow[] {
  const plainText = stripHtml(html);
  if (!/ETTJ\s*\/\s*Inflação\s+Implicita\s*\(IPCA\)/i.test(plainText) || !/%a\.a\.\/252/i.test(plainText)) {
    throw new Error("A página da ANBIMA não confirmou a tabela ETTJ/Inflação Implícita em %a.a./252.");
  }

  const asOf = parseAsOf(html);
  const tableRegex = /<table\b[^>]*>([\s\S]*?)<\/table>/gi;
  let tableMatch: RegExpExecArray | null;
  while ((tableMatch = tableRegex.exec(html)) !== null) {
    const table = tableMatch[1]!;
    const tableText = stripHtml(table);
    if (!/Vértices/i.test(tableText) || !/ETTJ\s+IPCA/i.test(tableText) || !/ETTJ\s+PRE/i.test(tableText)) continue;

    const rows: AnbimaEttjRow[] = [];
    const rowRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch: RegExpExecArray | null;
    while ((rowMatch = rowRegex.exec(table)) !== null) {
      const cells = extractCells(rowMatch[1]!);
      if (cells.length < 2) continue;
      const vertex = parseBrazilianDecimal(cells[0]!);
      if (vertex === null || !Number.isInteger(vertex) || vertex <= 0) continue;
      rows.push({
        asOf,
        vertexBusinessDays: vertex,
        ettjIpcaPctAa252: parseBrazilianDecimal(cells[1]!),
        ettjPrePctAa252: cells[2] ? parseBrazilianDecimal(cells[2]!) : null,
        impliedInflationPctAa252: cells[3] ? parseBrazilianDecimal(cells[3]!) : null,
        unit: "%a.a./252",
      });
    }
    if (rows.length > 0) return rows;
  }
  throw new Error("A página da ANBIMA não apresentou vértices ETTJ que pudessem ser normalizados.");
}

export async function fetchAnbimaEttj(
  fetcher: FetchLike = fetch,
  now: () => Date = () => new Date(),
): Promise<AnbimaEttjDataset> {
  const response = await fetcher(ANBIMA_ETTJ_URL, { headers: { Accept: "text/html" } });
  if (!response.ok) throw new Error(`A fonte oficial ANBIMA retornou HTTP ${response.status}.`);
  const rawHtml = decodeAnbimaHtml(await response.arrayBuffer());
  const dataframe = parseAnbimaEttjHtml(rawHtml);

  return {
    rawHtml,
    dataframe,
    lineage: {
      sourceId: "ANBIMA_ETTJ",
      sourceUrl: ANBIMA_ETTJ_URL,
      sourceFile: "CZ.asp",
      extractedAtUtc: now().toISOString(),
      sourceAsOf: dataframe[0]!.asOf,
      sourceHashSha256: createHash("sha256").update(rawHtml, "utf8").digest("hex"),
      parserVersion: "anbima-ettj-public-page-v1",
      validationStatus: dataframe.some(row => row.ettjIpcaPctAa252 === null) ? "warning" : "valid",
    },
  };
}

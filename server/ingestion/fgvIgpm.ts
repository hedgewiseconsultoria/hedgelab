import { createHash } from "node:crypto";
import { z } from "zod";
import type { DataLineage } from "../domain/dataframes";
import type { FetchLike } from "./bcbPtax";

const FGV_ALLOWED_HOST = "portal.fgv.br";
const MONTHS: Record<string, string> = {
  jan: "01",
  fev: "02",
  mar: "03",
  abr: "04",
  mai: "05",
  jun: "06",
  jul: "07",
  ago: "08",
  set: "09",
  out: "10",
  nov: "11",
  dez: "12",
};

export type IgpmObservation = {
  observationId: string;
  period: string;
  monthlyVariationPct: number;
  trailingTwelveMonthsPct: number;
  sourcePeriodLabel: string;
};

export type IgpmDataset = {
  rawHtml: string;
  dataframe: IgpmObservation[];
  lineage: DataLineage;
};

function assertApprovedFgvUrl(sourceUrl: string): URL {
  const url = new URL(sourceUrl);
  if (url.protocol !== "https:" || url.hostname !== FGV_ALLOWED_HOST) {
    throw new Error("A publicação do IGP-M deve pertencer ao domínio oficial portal.fgv.br.");
  }
  return url;
}

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&ndash;/gi, "–")
    .replace(/&minus;/gi, "−")
    .replace(/&#x?2212;/gi, "−")
    .replace(/&#x?00a0;/gi, " ");
}

function stripHtml(value: string): string {
  return decodeHtml(value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
}

function parsePercent(value: string): number | null {
  const normalized = value
    .replace(/%/g, "")
    .replace(/[−–—]/g, "-")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parsePeriod(label: string, expectedYear: number): string | null {
  const match = label.trim().toLowerCase().match(/^(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\/(\d{2})$/);
  if (!match) return null;
  const shortYear = Number(match[2]);
  if (expectedYear % 100 !== shortYear) return null;
  return `${expectedYear}${MONTHS[match[1]!]}`;
}

function parseIgpmRows(html: string, expectedYear: number): IgpmObservation[] {
  const visibleText = stripHtml(html);
  if (!/Índice Geral de Preços\s*-?\s*Mercado/i.test(visibleText) || !/Evolução\s+Mensal/i.test(visibleText)) {
    throw new Error("A publicação FGV não confirmou o contexto e a tabela do IGP-M.");
  }

  const rows: IgpmObservation[] = [];
  const tableRegex = /<table\b[^>]*>([\s\S]*?)<\/table>/gi;
  let tableMatch: RegExpExecArray | null;
  while ((tableMatch = tableRegex.exec(html)) !== null) {
    const table = tableMatch[1]!;
    const tableText = stripHtml(table);
    if (!/Evolução\s+Mensal/i.test(tableText) || !/Acumulado/i.test(tableText)) continue;
    const rowRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch: RegExpExecArray | null;
    while ((rowMatch = rowRegex.exec(table)) !== null) {
      const cells: string[] = [];
      const cellRegex = /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi;
      let cellMatch: RegExpExecArray | null;
      while ((cellMatch = cellRegex.exec(rowMatch[1]!)) !== null) {
        cells.push(stripHtml(cellMatch[1]!));
      }
      if (cells.length < 3) continue;
      const period = parsePeriod(cells[0]!, expectedYear);
      const monthlyVariationPct = parsePercent(cells[1]!);
      const trailingTwelveMonthsPct = parsePercent(cells[2]!);
      if (!period || monthlyVariationPct === null || trailingTwelveMonthsPct === null) continue;
      rows.push({
        observationId: `FGV_IGPM_${period}`,
        period,
        monthlyVariationPct,
        trailingTwelveMonthsPct,
        sourcePeriodLabel: cells[0]!,
      });
    }
  }

  if (rows.length === 0) {
    throw new Error("A publicação FGV não apresentou linhas mensais de IGP-M que pudessem ser validadas.");
  }
  return rows;
}

export async function fetchFgvIgpmPublishedTable(
  input: { sourceUrl: string; year: number },
  fetcher: FetchLike = fetch,
  now: () => Date = () => new Date(),
): Promise<IgpmDataset> {
  if (!Number.isInteger(input.year) || input.year < 1900 || input.year > 9999) {
    throw new Error("O ano da publicação FGV é inválido.");
  }
  const endpoint = assertApprovedFgvUrl(input.sourceUrl);
  const response = await fetcher(endpoint, { headers: { Accept: "text/html" } });
  if (!response.ok) throw new Error(`A fonte oficial FGV retornou HTTP ${response.status}.`);
  const rawHtml = await response.text();
  const dataframe = parseIgpmRows(rawHtml, input.year);

  return {
    rawHtml,
    dataframe,
    lineage: {
      sourceId: "FGV_IGPM",
      sourceUrl: endpoint.toString(),
      sourceFile: `publicacao-igpm-${input.year}.html`,
      extractedAtUtc: now().toISOString(),
      sourceAsOf: null,
      sourceHashSha256: createHash("sha256").update(rawHtml, "utf8").digest("hex"),
      parserVersion: "fgv-igpm-publication-table-v1",
      validationStatus: "valid",
    },
  };
}

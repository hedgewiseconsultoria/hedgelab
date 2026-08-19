import { createHash } from "node:crypto";
import { z } from "zod";
import type { DataLineage } from "../domain/dataframes";
import type { FetchLike } from "./bcbPtax";

const BCB_SGS_BASE_URL = "https://api.bcb.gov.br/dados/serie/bcdata.sgs";

const SGS_SELIC_SERIES = {
  DAILY_OVER: {
    code: 11,
    sourceId: "BCB_SGS_11_SELIC",
    sourceFile: "bcdata.sgs.11",
    parserVersion: "bcb-sgs-11-v1",
  },
  ANNUALIZED_AA252: {
    code: 1178,
    sourceId: "BCB_SGS_1178_SELIC_AA252",
    sourceFile: "bcdata.sgs.1178",
    parserVersion: "bcb-sgs-1178-aa252-v1",
  },
} as const;

export type BcbSelicSeriesCode = typeof SGS_SELIC_SERIES[keyof typeof SGS_SELIC_SERIES]["code"];
type BcbSelicSeriesDefinition = typeof SGS_SELIC_SERIES[keyof typeof SGS_SELIC_SERIES];

const sgsResponseSchema = z.array(z.object({ data: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/), valor: z.string().min(1) }));

export type BcbSelicObservation = {
  observationId: string;
  asOf: string;
  valuePct: number;
  seriesCode: BcbSelicSeriesCode;
  unit: "percent";
};

export type BcbSelicDataset = { raw: unknown; dataframe: BcbSelicObservation[]; lineage: DataLineage };

function assertIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("A data deve seguir o padrão AAAA-MM-DD.");
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month! - 1 || date.getUTCDate() !== day) throw new Error("A data informada não é válida.");
}

function toBcbDate(value: string) { const [year, month, day] = value.split("-"); return `${day}/${month}/${year}`; }
function fromBcbDate(value: string) { const [day, month, year] = value.split("/"); return `${year}-${month}-${day}`; }
function parseDecimal(value: string, seriesCode: BcbSelicSeriesCode) {
  const normalized = value.includes(",") ? value.replace(/\./g, "").replace(",", ".") : value;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) throw new Error(`A série SGS ${seriesCode} retornou valor não numérico.`);
  return parsed;
}

function buildBcbSelicUrl(series: BcbSelicSeriesDefinition, startDate: string, endDate: string): URL {
  assertIsoDate(startDate); assertIsoDate(endDate);
  if (startDate > endDate) throw new Error("A data inicial não pode ser posterior à data final.");
  const endpoint = new URL(`${BCB_SGS_BASE_URL}.${series.code}/dados`);
  endpoint.searchParams.set("formato", "json");
  endpoint.searchParams.set("dataInicial", toBcbDate(startDate));
  endpoint.searchParams.set("dataFinal", toBcbDate(endDate));
  return endpoint;
}

export function buildBcbSelicSgsUrl(startDate: string, endDate: string): URL {
  return buildBcbSelicUrl(SGS_SELIC_SERIES.DAILY_OVER, startDate, endDate);
}

export function buildBcbSelicAnnualized252Url(startDate: string, endDate: string): URL {
  return buildBcbSelicUrl(SGS_SELIC_SERIES.ANNUALIZED_AA252, startDate, endDate);
}

async function fetchBcbSelicSeries(series: BcbSelicSeriesDefinition, input: { startDate: string; endDate: string }, fetcher: FetchLike = fetch, now: () => Date = () => new Date()): Promise<BcbSelicDataset> {
  const endpoint = buildBcbSelicUrl(series, input.startDate, input.endDate);
  const response = await fetcher(endpoint, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`A fonte oficial BCB SGS retornou HTTP ${response.status}.`);
  const rawPayload = await response.text();
  let raw: unknown;
  try { raw = JSON.parse(rawPayload); } catch { throw new Error("A fonte oficial BCB SGS retornou conteúdo que não pôde ser lido como JSON."); }
  const parsed = sgsResponseSchema.safeParse(raw);
  if (!parsed.success || parsed.data.length === 0) throw new Error(`A resposta oficial SGS ${series.code} não contém observações válidas.`);
  return {
    raw,
    dataframe: parsed.data.map((entry, index) => ({ observationId: `BCB_SGS_${series.code}_${fromBcbDate(entry.data)}_${index + 1}`, asOf: fromBcbDate(entry.data), valuePct: parseDecimal(entry.valor, series.code), seriesCode: series.code, unit: "percent" })),
    lineage: { sourceId: series.sourceId, sourceUrl: endpoint.toString(), sourceFile: series.sourceFile, extractedAtUtc: now().toISOString(), sourceAsOf: input.endDate, sourceHashSha256: createHash("sha256").update(rawPayload, "utf8").digest("hex"), parserVersion: series.parserVersion, validationStatus: "valid" },
  };
}

/** Série SGS 11: observação diária oficial, sem transformação de capitalização. */
export async function fetchBcbSelicSgs(input: { startDate: string; endDate: string }, fetcher: FetchLike = fetch, now: () => Date = () => new Date()): Promise<BcbSelicDataset> {
  return fetchBcbSelicSeries(SGS_SELIC_SERIES.DAILY_OVER, input, fetcher, now);
}

/** Série SGS 1178: observação anualizada em base 252 publicada diretamente pelo BCB. */
export async function fetchBcbSelicAnnualized252(input: { startDate: string; endDate: string }, fetcher: FetchLike = fetch, now: () => Date = () => new Date()): Promise<BcbSelicDataset> {
  return fetchBcbSelicSeries(SGS_SELIC_SERIES.ANNUALIZED_AA252, input, fetcher, now);
}

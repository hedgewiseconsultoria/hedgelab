import { createHash } from "node:crypto";
import { z } from "zod";
import type { DataLineage } from "../domain/dataframes";
import type { FetchLike } from "./bcbPtax";

const IBGE_AGGREGATES_BASE_URL = "https://servicodados.ibge.gov.br/api/v3/agregados";
const IPCA_AGGREGATE_ID = "1737";
const IPCA_MONTHLY_VARIATION_VARIABLE_ID = "63";
const IPCA_INDEX_NUMBER_VARIABLE_ID = "2266";

const metadataSchema = z.object({
  id: z.number().or(z.string()),
  nome: z.string().min(1),
  periodicidade: z.object({ frequencia: z.string().min(1) }),
  variaveis: z.array(
    z.object({
      id: z.number().or(z.string()),
      nome: z.string().min(1),
      unidade: z.string().min(1),
    }),
  ),
});

const dataResponseSchema = z.array(
  z.object({
    id: z.string().or(z.number()),
    variavel: z.string().min(1),
    unidade: z.string().min(1),
    resultados: z.array(
      z.object({
        series: z.array(
          z.object({
            localidade: z.object({
              id: z.string().or(z.number()),
              nome: z.string().min(1),
              nivel: z.object({ id: z.string().min(1), nome: z.string().min(1) }),
            }),
            serie: z.record(z.string(), z.string()),
          }),
        ),
      }),
    ),
  }),
);

export type IpcaMonthlyObservation = {
  observationId: string;
  aggregateId: "1737";
  variableId: "63";
  variableName: string;
  unit: "%";
  period: string;
  localityId: string;
  localityName: string;
  value: number | null;
  unavailableSymbol: string | null;
};

export type IpcaDataset = {
  rawMetadata: unknown;
  rawData: unknown;
  dataframe: IpcaMonthlyObservation[];
  lineage: DataLineage;
};

export type IpcaIndexObservation = {
  observationId: string;
  aggregateId: "1737";
  variableId: "2266";
  variableName: string;
  unit: "Número-índice";
  period: string;
  localityId: string;
  localityName: string;
  value: number | null;
  unavailableSymbol: string | null;
};

export type IpcaIndexDataset = {
  rawMetadata: unknown;
  rawData: unknown;
  dataframe: IpcaIndexObservation[];
  lineage: DataLineage;
};

function assertPeriod(period: string): void {
  if (!/^\d{6}$/.test(period)) {
    throw new Error("O período do IPCA deve seguir o padrão AAAAMM.");
  }
  const month = Number(period.slice(4));
  if (month < 1 || month > 12) {
    throw new Error("O período do IPCA contém mês inválido.");
  }
}

export function buildIbgeIpcaMetadataUrl(): URL {
  return new URL(`${IBGE_AGGREGATES_BASE_URL}/${IPCA_AGGREGATE_ID}/metadados`);
}

export function buildIbgeIpcaMonthlyDataUrl(period: string): URL {
  assertPeriod(period);
  const endpoint = new URL(
    `${IBGE_AGGREGATES_BASE_URL}/${IPCA_AGGREGATE_ID}/periodos/${period}/variaveis/${IPCA_MONTHLY_VARIATION_VARIABLE_ID}`,
  );
  endpoint.searchParams.set("localidades", "N1[all]");
  return endpoint;
}

function createHashFromParts(parts: string[]): string {
  return createHash("sha256").update(parts.join("\n"), "utf8").digest("hex");
}

function toNumericValue(value: string): { value: number | null; unavailableSymbol: string | null } {
  const normalized = value.trim().replace(",", ".");
  if (normalized === "" || normalized === "..." || normalized === "X" || normalized === "..") {
    return { value: null, unavailableSymbol: value };
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return { value: null, unavailableSymbol: value };
  }
  return { value: parsed, unavailableSymbol: null };
}

async function fetchJson(url: URL, fetcher: FetchLike): Promise<{ rawText: string; body: unknown }> {
  const response = await fetcher(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`A fonte oficial IBGE retornou HTTP ${response.status}.`);
  const rawText = await response.text();
  try {
    return { rawText, body: JSON.parse(rawText) };
  } catch {
    throw new Error("A fonte oficial IBGE retornou conteúdo que não pôde ser lido como JSON.");
  }
}

export async function fetchIbgeIpcaMonthlyVariation(
  period: string,
  fetcher: FetchLike = fetch,
  now: () => Date = () => new Date(),
): Promise<IpcaDataset> {
  const metadataUrl = buildIbgeIpcaMetadataUrl();
  const dataUrl = buildIbgeIpcaMonthlyDataUrl(period);
  const [metadataResponse, dataResponse] = await Promise.all([
    fetchJson(metadataUrl, fetcher),
    fetchJson(dataUrl, fetcher),
  ]);

  const metadata = metadataSchema.safeParse(metadataResponse.body);
  if (!metadata.success || String(metadata.data.id) !== IPCA_AGGREGATE_ID || metadata.data.periodicidade.frequencia !== "mensal") {
    throw new Error("Os metadados do IBGE não confirmam o agregado mensal IPCA 1737.");
  }
  const monthlyVariable = metadata.data.variaveis.find(variable => String(variable.id) === IPCA_MONTHLY_VARIATION_VARIABLE_ID);
  if (!monthlyVariable || monthlyVariable.unidade !== "%") {
    throw new Error("Os metadados do IBGE não confirmam a variável mensal do IPCA em percentual.");
  }

  const data = dataResponseSchema.safeParse(dataResponse.body);
  if (!data.success) {
    throw new Error("A resposta do IBGE não contém o esquema esperado para a tabela 1737.");
  }
  const monthlyResponse = data.data.find(item => String(item.id) === IPCA_MONTHLY_VARIATION_VARIABLE_ID);
  if (!monthlyResponse || monthlyResponse.unidade !== "%") {
    throw new Error("A resposta do IBGE não confirmou a unidade percentual da variação mensal do IPCA.");
  }

  const rows: IpcaMonthlyObservation[] = [];
  for (const result of monthlyResponse.resultados) {
    for (const series of result.series) {
      for (const [seriesPeriod, rawValue] of Object.entries(series.serie)) {
        const parsedValue = toNumericValue(rawValue);
        rows.push({
          observationId: `IBGE_IPCA_1737_63_${series.localidade.id}_${seriesPeriod}`,
          aggregateId: "1737",
          variableId: "63",
          variableName: monthlyResponse.variavel,
          unit: "%",
          period: seriesPeriod,
          localityId: String(series.localidade.id),
          localityName: series.localidade.nome,
          value: parsedValue.value,
          unavailableSymbol: parsedValue.unavailableSymbol,
        });
      }
    }
  }

  if (rows.length === 0) {
    throw new Error("A fonte oficial IBGE não retornou observação de IPCA para o período solicitado.");
  }

  return {
    rawMetadata: metadataResponse.body,
    rawData: dataResponse.body,
    dataframe: rows,
    lineage: {
      sourceId: "IBGE_IPCA",
      sourceUrl: dataUrl.toString(),
      sourceFile: `agregado-1737-variavel-63-${period}.json`,
      extractedAtUtc: now().toISOString(),
      sourceAsOf: `${period.slice(0, 4)}-${period.slice(4, 6)}-01`,
      sourceHashSha256: createHashFromParts([metadataResponse.rawText, dataResponse.rawText]),
      parserVersion: "ibge-sidra-agregados-v3-1737-v1",
      validationStatus: rows.some(row => row.value === null) ? "warning" : "valid",
    },
  };
}

/** Recupera o número-índice oficial do IPCA (1737/2266), necessário para o quociente de correção descrito pelo IBGE. */
export async function fetchIbgeIpcaIndexNumber(
  period: string,
  fetcher: FetchLike = fetch,
  now: () => Date = () => new Date(),
): Promise<IpcaIndexDataset> {
  assertPeriod(period);
  const metadataUrl = buildIbgeIpcaMetadataUrl();
  const dataUrl = new URL(`${IBGE_AGGREGATES_BASE_URL}/${IPCA_AGGREGATE_ID}/periodos/${period}/variaveis/${IPCA_INDEX_NUMBER_VARIABLE_ID}`);
  dataUrl.searchParams.set("localidades", "N1[all]");
  const [metadataResponse, dataResponse] = await Promise.all([fetchJson(metadataUrl, fetcher), fetchJson(dataUrl, fetcher)]);
  const metadata = metadataSchema.safeParse(metadataResponse.body);
  if (!metadata.success || String(metadata.data.id) !== IPCA_AGGREGATE_ID || metadata.data.periodicidade.frequencia !== "mensal") throw new Error("Os metadados do IBGE não confirmam o agregado mensal IPCA 1737.");
  const indexVariable = metadata.data.variaveis.find(variable => String(variable.id) === IPCA_INDEX_NUMBER_VARIABLE_ID);
  if (!indexVariable || indexVariable.unidade !== "Número-índice") throw new Error("Os metadados do IBGE não confirmam a variável 2266 como número-índice do IPCA.");
  const data = dataResponseSchema.safeParse(dataResponse.body);
  if (!data.success) throw new Error("A resposta do IBGE não contém o esquema esperado para a tabela 1737.");
  const indexResponse = data.data.find(item => String(item.id) === IPCA_INDEX_NUMBER_VARIABLE_ID);
  if (!indexResponse || indexResponse.unidade !== "Número-índice") throw new Error("A resposta do IBGE não confirmou a unidade de número-índice IPCA.");
  const rows: IpcaIndexObservation[] = [];
  for (const result of indexResponse.resultados) for (const series of result.series) for (const [seriesPeriod, rawValue] of Object.entries(series.serie)) {
    const parsedValue = toNumericValue(rawValue);
    rows.push({ observationId: `IBGE_IPCA_1737_2266_${series.localidade.id}_${seriesPeriod}`, aggregateId: "1737", variableId: "2266", variableName: indexResponse.variavel, unit: "Número-índice", period: seriesPeriod, localityId: String(series.localidade.id), localityName: series.localidade.nome, value: parsedValue.value, unavailableSymbol: parsedValue.unavailableSymbol });
  }
  if (!rows.length) throw new Error("A fonte oficial IBGE não retornou número-índice IPCA para o período solicitado.");
  return { rawMetadata: metadataResponse.body, rawData: dataResponse.body, dataframe: rows, lineage: { sourceId: "IBGE_IPCA", sourceUrl: dataUrl.toString(), sourceFile: `agregado-1737-variavel-2266-${period}.json`, extractedAtUtc: now().toISOString(), sourceAsOf: `${period.slice(0, 4)}-${period.slice(4, 6)}-01`, sourceHashSha256: createHashFromParts([metadataResponse.rawText, dataResponse.rawText]), parserVersion: "ibge-sidra-agregados-v3-1737-index-v1", validationStatus: rows.some(row => row.value === null) ? "warning" : "valid" } };
}

import { createHash } from "node:crypto";
import { z } from "zod";
import type { DataLineage } from "../domain/dataframes";

const PTAX_ODATA_BASE_URL = "https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata";
const ptaxResponseSchema = z.object({
  value: z.array(
    z.object({
      cotacaoCompra: z.number().finite(),
      cotacaoVenda: z.number().finite(),
      dataHoraCotacao: z.string().min(1),
    }),
  ),
});

export type PtaxUsdObservation = {
  observationId: string;
  asOf: string;
  cotacaoCompra: number;
  cotacaoVenda: number;
  dataHoraCotacaoOficial: string;
  quoteConvention: "UNIDADE_MONETARIA_CORRENTE_POR_DOLAR_AMERICANO";
};

export type PtaxUsdDataset = {
  raw: unknown;
  dataframe: PtaxUsdObservation[];
  lineage: DataLineage;
  availabilityStatus: "quoted" | "unavailable";
  availabilityMessage: string | null;
};

export type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

function assertIsoDate(date: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("A data deve seguir o padrão AAAA-MM-DD.");
  }
  const [year, month, day] = date.split("-").map(Number);
  const parsed = new Date(Date.UTC(year!, month! - 1, day!));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month! - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error("A data informada não é válida.");
  }
}

/** Converte AAAA-MM-DD para o formato MM-DD-AAAA documentado pelo BCB. */
export function formatBcbPtaxDate(date: string): string {
  assertIsoDate(date);
  const [year, month, day] = date.split("-");
  return `${month}-${day}-${year}`;
}

export function buildPtaxUsdDayUrl(date: string): URL {
  const endpoint = new URL(`${PTAX_ODATA_BASE_URL}/CotacaoDolarDia(dataCotacao=@dataCotacao)`);
  endpoint.searchParams.set("@dataCotacao", `'${formatBcbPtaxDate(date)}'`);
  endpoint.searchParams.set("$format", "json");
  return endpoint;
}

function hashRawPayload(rawPayload: string): string {
  return createHash("sha256").update(rawPayload, "utf8").digest("hex");
}

function previousWeekday(date: string, offset: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year!, month! - 1, day!));
  let remaining = offset;
  while (remaining > 0) {
    value.setUTCDate(value.getUTCDate() - 1);
    if (value.getUTCDay() !== 0 && value.getUTCDay() !== 6) remaining -= 1;
  }
  return value.toISOString().slice(0, 10);
}

export async function fetchPtaxUsdDay(
  date: string,
  fetcher: FetchLike = fetch,
  now: () => Date = () => new Date(),
  allowPreviousPublishedFallback = true,
): Promise<PtaxUsdDataset> {
  const endpoint = buildPtaxUsdDayUrl(date);
  const response = await fetcher(endpoint, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`A fonte oficial PTAX retornou HTTP ${response.status}.`);
  }

  const rawPayload = await response.text();
  let raw: unknown;
  try {
    raw = JSON.parse(rawPayload);
  } catch {
    throw new Error("A fonte oficial PTAX retornou conteúdo que não pôde ser lido como JSON.");
  }

  const parsed = ptaxResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("A resposta PTAX não contém o esquema oficial esperado para CotacaoDolarDia.");
  }
  const extractedAtUtc = now().toISOString();
  const baseLineage = {
    sourceId: "BCB_PTAX" as const,
    sourceUrl: endpoint.toString(),
    sourceFile: "CotacaoDolarDia",
    extractedAtUtc,
    sourceAsOf: date,
    sourceHashSha256: hashRawPayload(rawPayload),
    parserVersion: "bcb-ptax-odata-v1",
  };
  if (parsed.data.value.length === 0 && allowPreviousPublishedFallback) {
    for (let offset = 1; offset <= 5; offset += 1) {
      const fallbackDate = previousWeekday(date, offset);
      try {
        const fallback = await fetchPtaxUsdDay(fallbackDate, fetcher, now, false);
        if (fallback.availabilityStatus === "quoted") {
          return {
            ...fallback,
            availabilityMessage: `Não havia PTAX publicada para ${date}; foi utilizada a última cotação oficial publicada em ${fallbackDate}. A data efetiva permanece registrada na linhagem.`,
          };
        }
      } catch {
        // Uma indisponibilidade pontual não impede a tentativa do dia útil anterior.
      }
    }
  }

  if (parsed.data.value.length === 0) {
    return {
      raw,
      dataframe: [],
      availabilityStatus: "unavailable",
      availabilityMessage: "O BCB não publicou cotação PTAX para a data-base informada nem para os cinco dias úteis anteriores. Nenhuma taxa substituta foi utilizada.",
      lineage: { ...baseLineage, validationStatus: "warning" },
    };
  }

  return {
    raw,
    dataframe: parsed.data.value.map((quote, index) => ({
      observationId: `BCB_PTAX_USD_${date}_${index + 1}`,
      asOf: date,
      cotacaoCompra: quote.cotacaoCompra,
      cotacaoVenda: quote.cotacaoVenda,
      dataHoraCotacaoOficial: quote.dataHoraCotacao,
      quoteConvention: "UNIDADE_MONETARIA_CORRENTE_POR_DOLAR_AMERICANO",
    })),
    availabilityStatus: "quoted",
    availabilityMessage: null,
    lineage: { ...baseLineage, validationStatus: "valid" },
  };
}

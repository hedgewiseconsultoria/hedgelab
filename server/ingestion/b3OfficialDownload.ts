import AdmZip from "adm-zip";
import { createHash } from "node:crypto";
import { storagePut } from "../storage";
import type { B3PriceReportType } from "../domain/dataframes";

const B3_DOWNLOAD_URL = "https://www.b3.com.br/pesquisapregao/download";

export type B3OfficialReportType = B3PriceReportType | "BVBG.028.02";

const reportSpec: Record<B3OfficialReportType, { prefix: "PR" | "SPRD" | "IN"; contentType: string }> = {
  "BVBG.086.01": { prefix: "PR", contentType: "application/zip" },
  "BVBG.187.01": { prefix: "SPRD", contentType: "application/zip" },
  "BVBG.028.02": { prefix: "IN", contentType: "application/zip" },
};

export type B3OfficialDownload = {
  reportType: B3OfficialReportType;
  sourceAsOf: string;
  officialDownloadUrl: string;
  outerArchive: { filename: string; bytes: number; sha256: string; storageKey: string | null; storageUrl: string | null };
  innerArchive: { filename: string; bytes: number; sha256: string };
  xmlFiles: Array<{ filename: string; bytes: number; sha256: string | null; body: Buffer | null }>;
  validationStatus: "downloaded" | "validated";
};

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

function toB3DateStamp(asOf: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) throw new Error("A data-base deve usar o formato AAAA-MM-DD.");
  const [year, month, day] = asOf.split("-");
  return `${year.slice(2)}${month}${day}`;
}

function sha256(data: Buffer) {
  return createHash("sha256").update(data).digest("hex");
}

/**
 * Baixa somente pelo fluxo publicado na página de Pesquisa por Pregão da B3.
 * O artefato externo e o ZIP interno são conservados, e cada XML é hashado
 * antes de qualquer parser receber seus bytes.
 */
export async function collectB3OfficialReport(input: {
  reportType: B3OfficialReportType;
  asOf: string;
  persistRaw?: boolean;
  metadataOnly?: boolean;
  timeoutMs?: number;
  fetcher?: FetchLike;
}): Promise<B3OfficialDownload> {
  const spec = reportSpec[input.reportType];
  const dateStamp = toB3DateStamp(input.asOf);
  const archiveFilename = `${spec.prefix}${dateStamp}.zip`;
  const officialUrl = new URL(B3_DOWNLOAD_URL);
  officialUrl.searchParams.set("filelist", `${archiveFilename},`);
  const fetcher = input.fetcher ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? 60_000);
  let response: Response;
  let outerBuffer: Buffer;
  try {
    response = await fetcher(officialUrl, { signal: controller.signal });
    if (!response.ok) throw new Error(`A B3 respondeu ${response.status} ao solicitar ${archiveFilename}.`);
    outerBuffer = Buffer.from(await response.arrayBuffer());
  } catch (error) {
    if (controller.signal.aborted) throw new Error(`A B3 não respondeu em ${input.timeoutMs ?? 60_000} ms ao solicitar ${archiveFilename}.`);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
  if (outerBuffer.length === 0) throw new Error(`A B3 retornou pacote vazio para ${archiveFilename}.`);

  const outerZip = new AdmZip(outerBuffer);
  const innerEntry = outerZip.getEntries().find(entry => entry.entryName === archiveFilename);
  if (!innerEntry) throw new Error(`O pacote externo não contém o ZIP interno ${archiveFilename}.`);
  const innerBuffer = innerEntry.getData();
  const innerZip = new AdmZip(innerBuffer);
  const xmlFiles = innerZip.getEntries()
    .filter(entry => !entry.isDirectory && entry.entryName.startsWith(`${input.reportType}_`) && entry.entryName.endsWith(".xml"))
    .map(entry => {
      if (input.metadataOnly) return { filename: entry.entryName, bytes: entry.header.size, sha256: null, body: null };
      const body = entry.getData();
      return { filename: entry.entryName, bytes: body.length, sha256: sha256(body), body };
    });
  if (xmlFiles.length === 0) throw new Error(`O ZIP interno ${archiveFilename} não contém XML ${input.reportType}.`);

  let storageKey: string | null = null;
  let storageUrl: string | null = null;
  if (input.persistRaw) {
    const stored = await storagePut(`b3/raw/${input.asOf}/${input.reportType}/${archiveFilename}`, outerBuffer, spec.contentType);
    storageKey = stored.key;
    storageUrl = stored.url;
  }

  return {
    reportType: input.reportType,
    sourceAsOf: input.asOf,
    officialDownloadUrl: officialUrl.toString(),
    outerArchive: { filename: archiveFilename, bytes: outerBuffer.length, sha256: sha256(outerBuffer), storageKey, storageUrl },
    innerArchive: { filename: archiveFilename, bytes: innerBuffer.length, sha256: sha256(innerBuffer) },
    xmlFiles,
    validationStatus: "downloaded",
  };
}

export async function collectB3OfficialPriceReport(input: {
  reportType: B3PriceReportType;
  asOf: string;
  persistRaw?: boolean;
  metadataOnly?: boolean;
  fetcher?: FetchLike;
}) {
  return collectB3OfficialReport(input);
}

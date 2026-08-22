import AdmZip from "adm-zip";
import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import yauzl from "yauzl";
import { storagePut } from "../storage";
import type { B3PriceReportType } from "../domain/dataframes";

const B3_DOWNLOAD_URL = "https://www.b3.com.br/pesquisapregao/download";

export type B3OfficialReportType = B3PriceReportType | "BVBG.028.02";

const reportSpec: Record<B3OfficialReportType, { prefix: "PR" | "SPRD" | "IN"; contentType: string }> = {
  "BVBG.086.01": { prefix: "PR", contentType: "application/zip" },
  "BVBG.187.01": { prefix: "SPRD", contentType: "application/zip" },
  "BVBG.028.02": { prefix: "IN", contentType: "application/zip" },
};

export type B3OfficialXmlFile = { filename: string; bytes: number; sha256: string | null; body: Buffer | null; openStream?: () => Promise<Readable> };

export type B3OfficialDownload = {
  reportType: B3OfficialReportType;
  sourceAsOf: string;
  officialDownloadUrl: string;
  attempts: number;
  outerArchive: { filename: string; bytes: number; sha256: string; storageKey: string | null; storageUrl: string | null };
  innerArchive: { filename: string; bytes: number; sha256: string };
  xmlFiles: B3OfficialXmlFile[];
  validationStatus: "downloaded" | "validated";
};

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

function pause(milliseconds: number) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function retryableHttpStatus(status: number) {
  return status === 408 || status === 429 || status >= 500;
}

function toB3DateStamp(asOf: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) throw new Error("A data-base deve usar o formato AAAA-MM-DD.");
  const [year, month, day] = asOf.split("-");
  return `${year.slice(2)}${month}${day}`;
}

function sha256(data: Buffer) {
  return createHash("sha256").update(data).digest("hex");
}

function describeUnexpectedDownloadContent(body: Buffer, filename: string) {
  const preview = body.subarray(0, 240).toString("utf8").replace(/\s+/g, " ").trim();
  if (/<!doctype html|<html[\s>]/i.test(preview)) {
    return `A B3 retornou uma página HTML, e não o arquivo oficial ${filename}. Nenhum arquivo ou DataFrame foi publicado.`;
  }
  return `A B3 retornou conteúdo que não é um arquivo ZIP válido para ${filename}. Nenhum arquivo ou DataFrame foi publicado.`;
}

function openZipFromBuffer(buffer: Buffer) {
  return new Promise<yauzl.ZipFile>((resolve, reject) => {
    yauzl.fromBuffer(buffer, { lazyEntries: true, autoClose: false }, (error, zip) => {
      if (error || !zip) reject(error ?? new Error("Não foi possível abrir o ZIP B3."));
      else resolve(zip);
    });
  });
}

async function openInnerB3XmlStream(innerBuffer: Buffer, filename: string): Promise<Readable> {
  const zip = await openZipFromBuffer(innerBuffer);
  return new Promise<Readable>((resolve, reject) => {
    let opened = false;
    const fail = (error: Error) => { zip.close(); reject(error); };
    zip.on("entry", entry => {
      if (entry.fileName !== filename) {
        zip.readEntry();
        return;
      }
      opened = true;
      zip.openReadStream(entry, (error, stream) => {
        if (error || !stream) return fail(error ?? new Error(`Não foi possível abrir o XML B3 ${filename}.`));
        stream.once("end", () => zip.close());
        stream.once("error", () => zip.close());
        resolve(stream);
      });
    });
    zip.once("end", () => { if (!opened) fail(new Error(`O ZIP interno não contém o XML B3 ${filename}.`)); });
    zip.once("error", fail);
    zip.readEntry();
  });
}

async function inspectInnerB3XmlEntries(innerBuffer: Buffer, reportType: B3OfficialReportType, metadataOnly: boolean): Promise<B3OfficialXmlFile[]> {
  const zip = await openZipFromBuffer(innerBuffer);
  const xmlFiles: B3OfficialXmlFile[] = [];
  await new Promise<void>((resolve, reject) => {
    zip.on("entry", entry => {
      if (!entry.fileName.endsWith("/") && entry.fileName.startsWith(`${reportType}_`) && entry.fileName.endsWith(".xml")) {
        xmlFiles.push({ filename: entry.fileName, bytes: entry.uncompressedSize, sha256: null, body: null, ...(metadataOnly ? {} : { openStream: () => openInnerB3XmlStream(innerBuffer, entry.fileName) }) });
      }
      zip.readEntry();
    });
    zip.once("end", resolve);
    zip.once("error", reject);
    zip.readEntry();
  }).finally(() => zip.close());
  return xmlFiles;
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
  maxAttempts?: number;
  retryDelayMs?: number;
  fetcher?: FetchLike;
}): Promise<B3OfficialDownload> {
  const spec = reportSpec[input.reportType];
  const dateStamp = toB3DateStamp(input.asOf);
  const archiveFilename = `${spec.prefix}${dateStamp}.zip`;
  const officialUrl = new URL(B3_DOWNLOAD_URL);
  officialUrl.searchParams.set("filelist", `${archiveFilename},`);
  const fetcher = input.fetcher ?? fetch;
  const maxAttempts = Math.max(1, Math.min(input.maxAttempts ?? 3, 3));
  const retryDelayMs = Math.max(0, input.retryDelayMs ?? 750);
  const timeoutMs = input.timeoutMs ?? 60_000;
  let attempts = 0;
  let outerBuffer: Buffer | null = null;
  let finalError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    attempts = attempt;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetcher(officialUrl, { signal: controller.signal });
      if (!response.ok) {
        const error = new Error(`A B3 respondeu ${response.status} ao solicitar ${archiveFilename}.`);
        finalError = error;
        if (!retryableHttpStatus(response.status)) break;
      } else {
        outerBuffer = Buffer.from(await response.arrayBuffer());
        clearTimeout(timeout);
        break;
      }
    } catch (error) {
      finalError = controller.signal.aborted
        ? new Error(`A B3 não respondeu em ${timeoutMs} ms ao solicitar ${archiveFilename}.`)
        : error instanceof Error ? error : new Error("A conexão com a B3 falhou sem mensagem legível.");
    } finally {
      clearTimeout(timeout);
    }
    if (attempt < maxAttempts) await pause(retryDelayMs * attempt);
  }
  if (!outerBuffer) {
    const detail = finalError?.message ?? "A B3 não retornou conteúdo para o arquivo solicitado.";
    throw new Error(`${detail} Tentativas esgotadas (${attempts}/${maxAttempts}); nenhum arquivo ou DataFrame foi publicado.`);
  }
  if (outerBuffer.length === 0) throw new Error(`A B3 retornou pacote vazio para ${archiveFilename}.`);
  if (outerBuffer.subarray(0, 2).toString("utf8") !== "PK") throw new Error(describeUnexpectedDownloadContent(outerBuffer, archiveFilename));

  const outerZip = new AdmZip(outerBuffer);
  const innerEntry = outerZip.getEntries().find(entry => entry.entryName === archiveFilename);
  if (!innerEntry) throw new Error(`O pacote externo não contém o ZIP interno ${archiveFilename}.`);
  const innerBuffer = innerEntry.getData();
  const xmlFiles = await inspectInnerB3XmlEntries(innerBuffer, input.reportType, input.metadataOnly ?? false);
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
    attempts,
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
  timeoutMs?: number;
  maxAttempts?: number;
  retryDelayMs?: number;
  fetcher?: FetchLike;
}) {
  return collectB3OfficialReport(input);
}

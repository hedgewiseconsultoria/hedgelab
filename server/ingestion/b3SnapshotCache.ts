import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { B3OfficialReportType } from "./b3OfficialDownload";
import type { B3MarketObservationRow, SupportedB3Family } from "../domain/dataframes";

export type B3TheoreticalMarginRow = {
  instrumentId: string;
  symbol: string;
  marginValue: number;
  clearingSystem: string | null;
  sourceFile: string;
  sourceHashSha256: string;
};

/**
 * Cache read-through para os pacotes ZIP oficiais da B3.
 *
 * Por que existe: baixar os arquivos direto da B3 durante a requisição do usuário é lento e
 * não é confiável no plano gratuito do Render (timeouts observados > 25s). Em vez de usar um
 * feed pago ou inventar dado, um workflow do GitHub Actions roda 1x/dia, baixa o MESMO pacote
 * ZIP público da B3 (sem transformação) e o commita em `b3-snapshots/{asOf}/{reportType}.zip`
 * no repositório. Este módulo apenas tenta ler esse arquivo, byte a byte idêntico ao que a B3
 * serviria ao vivo, antes de cair para o download ao vivo existente. Nada no parser ou na
 * validação de hash/linhagem muda — o cache só evita a espera de rede na hora da requisição.
 *
 * Totalmente opcional: sem as variáveis de ambiente configuradas, este módulo não faz nada e o
 * comportamento é idêntico ao anterior (download ao vivo em toda requisição).
 */

export type B3SnapshotCacheResult = {
  buffer: Buffer;
  source: "github_snapshot_cache";
  snapshotPath: string;
};

export type B3ContractCatalogSnapshot = {
  schemaVersion: "1.0.0";
  asOf: string;
  generatedAtUtc: string;
  associationStatus: "valid" | "blocked_asof_mismatch";
  rows: B3MarketObservationRow[];
  /** Margem Teórica Máxima B3 por unidade, sem netting e sem representar chamada CORE. */
  marginRows?: B3TheoreticalMarginRow[];
  coverage: Array<{ family: SupportedB3Family; records: number; futureRecords: number; optionRecords: number; recordsWithTradePrice: number; recordsWithAdjustedQuote: number }>;
  issues: Array<{ code: string; severity: string; instrumentId: string | null; family: SupportedB3Family | null; message: string }>;
  lineage: {
    price: { sourceAsOf: string; officialDownloadUrl: string; outerArchive: { filename: string; bytes: number; sha256: string }; xml: { sourceFile: string; sha256: string } };
    instrument: { sourceAsOf: string; officialDownloadUrl: string; outerArchive: { filename: string; bytes: number; sha256: string }; xml: { sourceFile: string; sha256: string } };
    margin?: { sourceAsOf: string; officialDownloadUrl: string; archive: { filename: string; sha256: string }; csv: { sourceFile: string } };
  };
};

type CacheConfig = {
  owner: string;
  repo: string;
  branch: string;
  token: string | null;
};

function readCacheConfig(): CacheConfig | null {
  const owner = process.env.B3_SNAPSHOT_CACHE_GITHUB_OWNER?.trim();
  const repo = process.env.B3_SNAPSHOT_CACHE_GITHUB_REPO?.trim();
  if (!owner || !repo) return null;
  const branch = process.env.B3_SNAPSHOT_CACHE_GITHUB_BRANCH?.trim() || "main";
  const token = process.env.B3_SNAPSHOT_CACHE_GITHUB_TOKEN?.trim() || null;
  return { owner, repo, branch, token };
}

function snapshotPathFor(reportType: B3OfficialReportType, asOf: string, archiveFilename: string) {
  return `b3-snapshots/${asOf}/${reportType}/${archiveFilename}`;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Tenta ler o pacote ZIP oficial de um snapshot diário publicado no GitHub. Retorna `null` em
 * qualquer cenário de indisponibilidade (não configurado, snapshot ausente para a data, hash
 * divergente, erro de rede) — nunca lança exceção e nunca inventa bytes: o chamador simplesmente
 * segue para o download ao vivo, exatamente como fazia antes deste módulo existir.
 */
export async function readB3ContractCatalogSnapshot(input: { asOf: string; timeoutMs?: number }): Promise<B3ContractCatalogSnapshot | null> {
  const localRoot = process.env.B3_SNAPSHOT_CACHE_ROOT?.trim();
  const localPath = localRoot ? resolve(localRoot, `b3-snapshots/${input.asOf}/catalog.json`) : null;
  const localHashPath = localPath ? `${localPath}.sha256` : null;
  if (localPath && localHashPath) {
    try {
      const bytes = await readFile(localPath);
      const expectedHash = (await readFile(localHashPath, "utf8")).trim().split(/\s+/)[0];
      const actualHash = createHash("sha256").update(bytes).digest("hex");
      if (!expectedHash || expectedHash !== actualHash) return null;
      const parsed = JSON.parse(bytes.toString("utf8")) as B3ContractCatalogSnapshot;
      if (parsed.schemaVersion !== "1.0.0" || parsed.asOf !== input.asOf || !Array.isArray(parsed.rows) || !parsed.lineage?.price || !parsed.lineage?.instrument) return null;
      return parsed;
    } catch {
      // O workflow ainda pode estar em processo de baixar ou gerar o índice local.
    }
  }
  const config = readCacheConfig();
  if (!config) return null;
  const timeoutMs = input.timeoutMs ?? 10_000;
  const ref = encodeURIComponent(config.branch);
  const rawBase = `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${ref}`;
  const path = `b3-snapshots/${input.asOf}/catalog.json`;
  try {
    const requestHeaders = { "User-Agent": "hedge-lab-b3-catalog-cache", Accept: "application/json" };
    const jsonResponse = await fetchWithTimeout(`${rawBase}/${path}?ref=${ref}`, { headers: requestHeaders }, timeoutMs);
    const hashResponse = await fetchWithTimeout(`${rawBase}/${path}.sha256?ref=${ref}`, { headers: requestHeaders }, timeoutMs);
    if (!jsonResponse.ok || !hashResponse.ok) return null;
    const bytes = Buffer.from(await jsonResponse.arrayBuffer());
    const expectedHash = (await hashResponse.text()).trim().split(/\s+/)[0];
    const actualHash = createHash("sha256").update(bytes).digest("hex");
    if (!expectedHash || expectedHash !== actualHash) return null;
    const parsed = JSON.parse(bytes.toString("utf8")) as B3ContractCatalogSnapshot;
    if (parsed.schemaVersion !== "1.0.0" || parsed.asOf !== input.asOf || !Array.isArray(parsed.rows) || !parsed.lineage?.price || !parsed.lineage?.instrument) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function readB3ArchiveFromSnapshotCache(input: {
  reportType: B3OfficialReportType;
  asOf: string;
  archiveFilename: string;
  timeoutMs?: number;
}): Promise<B3SnapshotCacheResult | null> {
  const localRoot = process.env.B3_SNAPSHOT_CACHE_ROOT?.trim();
  const path = snapshotPathFor(input.reportType, input.asOf, input.archiveFilename);
  if (localRoot) {
    try {
      const archivePath = resolve(localRoot, path);
      const sidecarPath = `${archivePath}.sha256`;
      const buffer = await readFile(archivePath);
      const expectedHash = (await readFile(sidecarPath, "utf8")).trim().split(/\s+/)[0];
      const actualHash = createHash("sha256").update(buffer).digest("hex");
      if (buffer.length > 0 && buffer.subarray(0, 2).toString("utf8") === "PK" && expectedHash && expectedHash === actualHash) return { buffer, source: "github_snapshot_cache", snapshotPath: path };
    } catch {
      // O workflow pode não ter salvo um dos boletins; nesse caso o caminho remoto continua disponível.
    }
  }
  const config = readCacheConfig();
  if (!config) return null;
  // Os snapshots oficiais podem ter dezenas de MB; 10s aborta o download no Render antes do SHA-256.
  const timeoutMs = input.timeoutMs ?? 60_000;
  const headers: Record<string, string> = { Accept: "application/vnd.github.raw+json", "User-Agent": "hedge-lab-b3-snapshot-cache" };
  if (config.token) headers.Authorization = `Bearer ${config.token}`;

  try {
    const ref = encodeURIComponent(config.branch);
    const rawBase = `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${ref}`;
    const rawZipUrl = `${rawBase}/${path}?ref=${ref}`;
    const rawHashUrl = `${rawBase}/${path}.sha256?ref=${ref}`;
    const requestHeaders = { "User-Agent": "hedge-lab-b3-snapshot-cache" };

    // O raw.githubusercontent.com entrega o ZIP diretamente e evita a latência/limite do
    // endpoint /contents. O parâmetro ref também mantém os mocks e branches explícitos.
    let zipResponse = await fetchWithTimeout(rawZipUrl, { headers: requestHeaders }, timeoutMs);
    let sha256Response: Response | null = null;
    if (!zipResponse?.ok) {
      const contentsUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}?ref=${ref}`;
      zipResponse = await fetchWithTimeout(contentsUrl, { headers }, timeoutMs);
      if (!zipResponse?.ok) return null;
      sha256Response = await fetchWithTimeout(`https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}.sha256?ref=${ref}`, { headers }, timeoutMs);
    } else {
      sha256Response = await fetchWithTimeout(rawHashUrl, { headers: requestHeaders }, timeoutMs);
    }
    if (!sha256Response?.ok) return null;
    const buffer = Buffer.from(await zipResponse.arrayBuffer());
    if (buffer.length === 0 || buffer.subarray(0, 2).toString("utf8") !== "PK") return null;
    const expectedHash = (await sha256Response.text()).trim().split(/\s+/)[0];
    const actualHash = createHash("sha256").update(buffer).digest("hex");
    if (!expectedHash || expectedHash !== actualHash) return null;

    return { buffer, source: "github_snapshot_cache", snapshotPath: path };
  } catch {
    return null;
  }
}

/** Usado apenas pelo workflow de coleta (`scripts/collect-b3-daily-snapshot.mjs`) para nomear o sidecar de hash local. */
export function sha256SidecarFor(archiveFilename: string) {
  return `${archiveFilename}.sha256`;
}

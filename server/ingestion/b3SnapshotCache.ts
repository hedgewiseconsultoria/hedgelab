import { createHash } from "node:crypto";
import type { B3OfficialReportType } from "./b3OfficialDownload";

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
export async function readB3ArchiveFromSnapshotCache(input: {
  reportType: B3OfficialReportType;
  asOf: string;
  archiveFilename: string;
  timeoutMs?: number;
}): Promise<B3SnapshotCacheResult | null> {
  const config = readCacheConfig();
  if (!config) return null;
  const path = snapshotPathFor(input.reportType, input.asOf, input.archiveFilename);
  const timeoutMs = input.timeoutMs ?? 10_000;
  const headers: Record<string, string> = { Accept: "application/vnd.github.raw+json", "User-Agent": "hedge-lab-b3-snapshot-cache" };
  if (config.token) headers.Authorization = `Bearer ${config.token}`;

  try {
    const contentsUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}?ref=${encodeURIComponent(config.branch)}`;
    const zipResponse = await fetchWithTimeout(contentsUrl, { headers }, timeoutMs);
    if (!zipResponse.ok) return null;
    const buffer = Buffer.from(await zipResponse.arrayBuffer());
    if (buffer.length === 0 || buffer.subarray(0, 2).toString("utf8") !== "PK") return null;

    const sha256Url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}.sha256?ref=${encodeURIComponent(config.branch)}`;
    const sha256Response = await fetchWithTimeout(sha256Url, { headers: { ...headers, Accept: "application/vnd.github.raw+json" } }, timeoutMs);
    if (!sha256Response.ok) return null;
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

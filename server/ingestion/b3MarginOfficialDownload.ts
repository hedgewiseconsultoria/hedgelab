import { createHash } from "node:crypto";
import AdmZip from "adm-zip";

const B3_DOWNLOAD_URL = "https://www.b3.com.br/pesquisapregao/download";

function dateStamp(asOf: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) throw new Error("A data-base deve usar o formato AAAA-MM-DD.");
  return asOf.slice(2).replace(/-/g, "");
}

export async function collectB3TheoreticalMarginArchive(input: { asOf: string; timeoutMs?: number }) {
  const archiveFilename = `MT${dateStamp(input.asOf)}.zip`;
  const officialDownloadUrl = new URL(B3_DOWNLOAD_URL);
  officialDownloadUrl.searchParams.set("filelist", `${archiveFilename},`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? 180_000);
  try {
    const response = await fetch(officialDownloadUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
        Accept: "application/zip,application/octet-stream,*/*",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
        Referer: "https://www.b3.com.br/pt_br/market-data-e-indices/servicos-de-dados/market-data/historico/boletins-diarios/pesquisa-por-pregao/pesquisa-por-pregao/",
      },
    });
    if (!response.ok) throw new Error(`A B3 respondeu ${response.status} ao solicitar ${archiveFilename}.`);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 22 || buffer.subarray(0, 2).toString("utf8") !== "PK") throw new Error(`A B3 não retornou um ZIP válido para ${archiveFilename}.`);
    const outer = new AdmZip(buffer);
    const inner = outer.getEntry(archiveFilename);
    if (!inner) throw new Error(`O arquivo oficial de margem não contém o ZIP interno ${archiveFilename}.`);
    return {
      asOf: input.asOf,
      archiveFilename,
      officialDownloadUrl: officialDownloadUrl.toString(),
      buffer,
      sha256: createHash("sha256").update(buffer).digest("hex"),
      bytes: buffer.length,
      innerBytes: inner.getData().length,
    };
  } finally {
    clearTimeout(timeout);
  }
}

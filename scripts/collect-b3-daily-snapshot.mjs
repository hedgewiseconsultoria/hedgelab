// Executado 1x/dia pelo workflow .github/workflows/b3-daily-snapshot.yml (GitHub Actions, gratuito).
//
// Baixa os MESMOS pacotes ZIP públicos que a B3 serve em
// https://www.b3.com.br/pesquisapregao/download — sem transformação, sem parsing, sem
// invenção de dado — e grava os bytes brutos + um sidecar .sha256 em b3-snapshots/{asOf}/{tipo}/.
// O workflow então commita esses arquivos no repositório. O servidor do HEDGE LAB (em
// server/ingestion/b3SnapshotCache.ts) lê esses mesmos bytes via API do GitHub antes de tentar
// um download ao vivo, evitando o timeout observado no plano gratuito do Render.
//
// Roda fora do caminho de requisição do usuário, então pode usar timeouts generosos (o Actions
// permite até 6h em repositórios públicos/privados no plano gratuito, muito acima do necessário).

import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { collectB3OfficialReport } from "../server/ingestion/b3OfficialDownload.ts";

const REPORT_TYPES = ["BVBG.028.02", "BVBG.086.01", "BVBG.187.01"];
const OUTPUT_ROOT = resolve(process.env.B3_SNAPSHOT_OUTPUT_DIR ?? "b3-snapshots");

function saoPauloDateStamp(offsetDays) {
  const now = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });
  return formatter.format(now); // AAAA-MM-DD
}

function isWeekend(isoDate) {
  const day = new Date(`${isoDate}T12:00:00-03:00`).getUTCDay();
  return day === 0 || day === 6;
}

/** Tenta hoje e, se a B3 ainda não publicou (comum antes do fechamento/processamento noturno), o último dia útil anterior. */
function candidateDates() {
  const candidates = [];
  for (let offset = 0; offset >= -3 && candidates.length < 2; offset -= 1) {
    const date = saoPauloDateStamp(offset);
    if (!isWeekend(date)) candidates.push(date);
  }
  return candidates;
}

async function collectOne(reportType, asOf) {
  try {
    const result = await collectB3OfficialReport({
      reportType,
      asOf,
      metadataOnly: true,
      timeoutMs: 120_000,
      maxAttempts: 3,
      skipSnapshotCache: true,
      includeRawOuterBuffer: true,
    });
    return { status: "fulfilled", asOf, reportType, result };
  } catch (error) {
    return { status: "rejected", asOf, reportType, reason: error instanceof Error ? error.message : String(error) };
  }
}

const summary = [];
for (const asOf of candidateDates()) {
  for (const reportType of REPORT_TYPES) {
    const outcome = await collectOne(reportType, asOf);
    if (outcome.status === "fulfilled") {
      const { result } = outcome;
      const archiveFilename = result.outerArchive.filename;
      const dir = resolve(OUTPUT_ROOT, asOf, reportType);
      mkdirSync(dir, { recursive: true });
      const bytes = result.rawOuterBuffer;
      writeFileSync(resolve(dir, archiveFilename), bytes);
      writeFileSync(resolve(dir, `${archiveFilename}.sha256`), createHash("sha256").update(bytes).digest("hex"));
      summary.push({ asOf, reportType, status: "saved", archiveFilename, bytes: bytes.length, sha256: result.outerArchive.sha256, officialDownloadUrl: result.officialDownloadUrl });
    } else {
      summary.push({ asOf, reportType, status: "unavailable", reason: outcome.reason });
    }
  }
}

mkdirSync(OUTPUT_ROOT, { recursive: true });
writeFileSync(resolve(OUTPUT_ROOT, "collection-log.json"), JSON.stringify({ collectedAtUtc: new Date().toISOString(), summary }, null, 2));
console.log(JSON.stringify(summary, null, 2));

const anySaved = summary.some(entry => entry.status === "saved");
if (!anySaved) {
  console.error("Nenhum boletim oficial pôde ser coletado nas datas candidatas. O cache não será atualizado nesta execução.");
  process.exitCode = 1;
}

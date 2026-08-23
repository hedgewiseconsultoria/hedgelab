import { toCsv } from "@/lib/csvDownload";

export type ExposureCsvRow = {
  exposure_id: string;
  description: string;
  currency: string;
  direction: "RECEIVABLE" | "PAYABLE";
  notional: number;
  cashflow_date: string;
  created_at_utc: string;
  exposure_class?: "FINANCIAL" | "PHYSICAL_COMMODITY";
  physical_quantity?: number | null;
  physical_unit?: string | null;
  commodity_reference?: string | null;
};

export type ExposureCsvManifest = {
  schemaVersion: "1.0.0";
  artifactType: "hedge_lab_exposure_dataframe_csv";
  encoding: "utf8_csv_rfc4180";
  generatedAtUtc: string;
  rows: number;
  columns: string[];
  sha256: string;
  lineage: Array<Record<string, unknown>>;
};

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]!;
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') { cell += '"'; index += 1; }
      else if (character === '"') quoted = false;
      else cell += character;
      continue;
    }
    if (character === '"') quoted = true;
    else if (character === ",") { row.push(cell); cell = ""; }
    else if (character === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (character !== "\r") cell += character;
  }
  if (quoted) throw new Error("CSV inválido: aspas não foram fechadas.");
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function assertExposureRows(rows: Array<Record<string, string>>): ExposureCsvRow[] {
  const required = ["exposure_id", "description", "currency", "direction", "notional", "cashflow_date", "created_at_utc"];
  return rows.map((row, index) => {
    if (required.some(key => !row[key]?.trim())) throw new Error(`CSV inválido: a linha ${index + 2} não contém todos os campos obrigatórios.`);
    const notional = Number(row.notional);
    if (!Number.isFinite(notional)) throw new Error(`CSV inválido: o nocional da linha ${index + 2} é inválido.`);
    if (row.direction !== "RECEIVABLE" && row.direction !== "PAYABLE") throw new Error(`CSV inválido: a direção da linha ${index + 2} é inválida.`);
    const base: ExposureCsvRow = { exposure_id: row.exposure_id!, description: row.description!, currency: row.currency!, direction: row.direction, notional, cashflow_date: row.cashflow_date!, created_at_utc: row.created_at_utc! };
    // Colunas físicas são opcionais e só existem em CSVs exportados após a versão 1.1 do schema — preservadas apenas quando o cabeçalho as trouxer, para não quebrar o round-trip de arquivos antigos.
    if ("exposure_class" in row) {
      const exposureClass = row.exposure_class === "PHYSICAL_COMMODITY" ? "PHYSICAL_COMMODITY" as const : row.exposure_class === "FINANCIAL" ? "FINANCIAL" as const : undefined;
      const physicalQuantity = row.physical_quantity?.trim() ? Number(row.physical_quantity) : null;
      if (row.physical_quantity?.trim() && !Number.isFinite(physicalQuantity)) throw new Error(`CSV inválido: a quantidade física da linha ${index + 2} é inválida.`);
      base.exposure_class = exposureClass;
      base.physical_quantity = physicalQuantity;
      base.physical_unit = row.physical_unit?.trim() || null;
      base.commodity_reference = row.commodity_reference?.trim() || null;
    }
    return base;
  });
}

export async function createExposureCsvArtifact(rows: ExposureCsvRow[], lineage: Array<Record<string, unknown>>, generatedAtUtc = new Date().toISOString()) {
  const csv = toCsv(rows);
  return {
    csv,
    manifest: {
      schemaVersion: "1.0.0" as const,
      artifactType: "hedge_lab_exposure_dataframe_csv" as const,
      encoding: "utf8_csv_rfc4180" as const,
      generatedAtUtc,
      rows: rows.length,
      columns: rows.length ? Object.keys(rows[0]!).sort() : [],
      sha256: await sha256(csv),
      lineage,
    },
  };
}

export async function readExposureCsvArtifact(csv: string, manifest: ExposureCsvManifest): Promise<ExposureCsvRow[]> {
  if (manifest.schemaVersion !== "1.0.0" || manifest.artifactType !== "hedge_lab_exposure_dataframe_csv" || manifest.encoding !== "utf8_csv_rfc4180") throw new Error("Manifesto CSV incompatível com o HEDGE LAB.");
  if (!Array.isArray(manifest.lineage)) throw new Error("Manifesto CSV não contém a linhagem exigida.");
  if (!Number.isFinite(Date.parse(manifest.generatedAtUtc))) throw new Error("Manifesto CSV não contém uma data de geração válida.");
  if (await sha256(csv) !== manifest.sha256) throw new Error("Hash SHA-256 do CSV não confere com o manifesto.");
  const parsed = parseCsv(csv.replace(/^\ufeff/, ""));
  if (parsed.length === 0) {
    if (manifest.rows !== 0) throw new Error("Contagem de linhas do CSV diverge do manifesto.");
    return [];
  }
  const [columns, ...values] = parsed;
  if (!columns || JSON.stringify([...columns].sort()) !== JSON.stringify([...manifest.columns].sort())) throw new Error("Colunas do CSV divergem do manifesto.");
  if (values.length !== manifest.rows) throw new Error("Contagem de linhas do CSV diverge do manifesto.");
  return assertExposureRows(values.map(value => Object.fromEntries(columns.map((column, index) => [column, value[index] ?? ""]))));
}

import { PassThrough } from "node:stream";
import parquet from "parquetjs-lite";
import { canonicalJson, createScenarioBundle, importScenarioBundle, sha256, type HedgeLabDataFrames, type HedgeLabScenarioBundle } from "./scenarioBundle";

export type ParquetDataFrameArtifact = {
  schemaVersion: "1.0.0";
  encoding: "parquet_row_json";
  rows: number;
  sha256: string;
  bytes: Buffer;
  manifest: { schemaVersion: "1.0.0"; encoding: "parquet_row_json"; rows: number; sha256: string };
};

type SessionParquetRow = { dataframe: keyof HedgeLabDataFrames; row: Record<string, unknown> };

export type ParquetScenarioManifest = {
  schemaVersion: "1.0.0";
  encoding: "parquet_row_json";
  rows: number;
  sha256: string;
  dataframeRows: Record<keyof HedgeLabDataFrames, number>;
  scenarioBundle: HedgeLabScenarioBundle;
};

/** Serializa linhas heterogêneas sem inferir tipos de mercado: cada registro permanece JSON canônico dentro do Parquet. */
export async function createParquetDataFrameArtifact(rows: Array<Record<string, unknown>>): Promise<ParquetDataFrameArtifact> {
  const output = new PassThrough();
  const chunks: Buffer[] = [];
  output.on("data", chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
  const schema = new parquet.ParquetSchema({ row_json: { type: "UTF8", optional: false } });
  const writer = await parquet.ParquetWriter.openStream(schema, output);
  for (const row of rows) await writer.appendRow({ row_json: canonicalJson(row) });
  await writer.close();
  const bytes = Buffer.concat(chunks);
  const artifact = { schemaVersion: "1.0.0" as const, encoding: "parquet_row_json" as const, rows: rows.length, sha256: sha256(bytes.toString("base64")), bytes };
  return { ...artifact, manifest: { schemaVersion: artifact.schemaVersion, encoding: artifact.encoding, rows: artifact.rows, sha256: artifact.sha256 } };
}

export async function readParquetDataFrameArtifact(bytes: Buffer, expectedSha256: string): Promise<Array<Record<string, unknown>>> {
  if (sha256(bytes.toString("base64")) !== expectedSha256) throw new Error("Artefato Parquet rejeitado: hash divergente.");
  const reader = await parquet.ParquetReader.openBuffer(bytes);
  const cursor = reader.getCursor();
  const rows: Array<Record<string, unknown>> = [];
  let item = await cursor.next();
  while (item) { rows.push(JSON.parse(String(item.row_json)) as Record<string, unknown>); item = await cursor.next(); }
  await reader.close();
  return rows;
}

/** Associa o arquivo Parquet ao bundle JSON já hasheado; o manifesto preserva os dois artefatos para conferência conjunta. */
export async function createParquetScenarioArtifact(input: {
  bundleId: string;
  exportedAtUtc: string;
  dataframes: HedgeLabDataFrames;
}): Promise<{ bytes: Buffer; manifest: ParquetScenarioManifest }> {
  const scenarioBundle = createScenarioBundle(input);
  const dataframeNames = Object.keys(scenarioBundle.dataframes) as Array<keyof HedgeLabDataFrames>;
  const rows = dataframeNames.flatMap(dataframe =>
    (scenarioBundle.dataframes[dataframe] ?? []).map(row => ({ dataframe, row: row as Record<string, unknown> })),
  );
  const artifact = await createParquetDataFrameArtifact(rows);
  const dataframeRows = Object.fromEntries(dataframeNames.map(dataframe => [dataframe, (scenarioBundle.dataframes[dataframe] ?? []).length])) as Record<keyof HedgeLabDataFrames, number>;
  return { bytes: artifact.bytes, manifest: { ...artifact.manifest, dataframeRows, scenarioBundle } };
}

/** Rejeita o pacote se o arquivo, o manifesto ou os DataFrames divergem do bundle de cenário declarado. */
export async function readParquetScenarioArtifact(bytes: Buffer, manifest: ParquetScenarioManifest): Promise<HedgeLabScenarioBundle> {
  const declaredBundle = importScenarioBundle(JSON.stringify(manifest.scenarioBundle));
  const rows = await readParquetDataFrameArtifact(bytes, manifest.sha256);
  const dataframeNames = Object.keys(declaredBundle.dataframes) as Array<keyof HedgeLabDataFrames>;
  const restored = Object.fromEntries(dataframeNames.map(dataframe => [dataframe, []])) as unknown as HedgeLabDataFrames;
  for (const entry of rows) {
    const dataframe = entry.dataframe;
    const row = entry.row;
    if (typeof dataframe !== "string" || !dataframeNames.includes(dataframe as keyof HedgeLabDataFrames) || !row || typeof row !== "object" || Array.isArray(row)) {
      throw new Error("Artefato Parquet rejeitado: registro de DataFrame inválido.");
    }
    const rowsForDataframe = restored[dataframe as keyof HedgeLabDataFrames] ?? [];
    rowsForDataframe.push(row as never);
    (restored as Record<string, unknown>)[dataframe] = rowsForDataframe;
  }
  for (const dataframe of dataframeNames) {
    if ((restored[dataframe] ?? []).length !== manifest.dataframeRows[dataframe]) {
      throw new Error(`Artefato Parquet rejeitado: contagem divergente no DataFrame ${dataframe}.`);
    }
  }
  if (canonicalJson(restored) !== canonicalJson(declaredBundle.dataframes)) {
    throw new Error("Artefato Parquet rejeitado: os DataFrames divergem do pacote de cenário no manifesto.");
  }
  return importScenarioBundle(JSON.stringify({ ...declaredBundle, dataframes: restored }));
}

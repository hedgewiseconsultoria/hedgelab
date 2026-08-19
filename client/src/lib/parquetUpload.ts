export async function prepareParquetSessionImport(files: File[]): Promise<{ bytesBase64: string; manifest: unknown }> {
  const parquetFile = files.find(file => file.name.toLowerCase().endsWith(".parquet"));
  const manifestFile = files.find(file => file.name.toLowerCase().endsWith(".parquet.manifest.json"));
  if (!parquetFile || !manifestFile) throw new Error("Selecione, juntos, o arquivo .parquet e o respectivo .parquet.manifest.json.");
  let manifest: unknown;
  try { manifest = JSON.parse(await manifestFile.text()); } catch { throw new Error("O manifesto Parquet não contém JSON válido."); }
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo Parquet selecionado."));
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Não foi possível ler o arquivo Parquet selecionado."));
    reader.readAsDataURL(parquetFile);
  });
  const bytesBase64 = dataUrl.split(",")[1];
  if (!bytesBase64) throw new Error("O arquivo Parquet selecionado não pôde ser codificado.");
  return { bytesBase64, manifest };
}

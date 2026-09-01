// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { prepareParquetSessionImport } from "./parquetUpload";

describe("prepareParquetSessionImport", () => {
  it("lê o par de arquivos da sessão e preserva bytes e manifesto para validação do servidor", async () => {
    const parquet = new File([new Uint8Array([1, 2, 3])], "sessao.parquet", { type: "application/vnd.apache.parquet" });
    const manifest = new File([JSON.stringify({ sha256: "a".repeat(64) })], "sessao.parquet.manifest.json", { type: "application/json" });
    const prepared = await prepareParquetSessionImport([manifest, parquet]);
    expect(prepared.bytesBase64).toBe("AQID");
    expect(prepared.manifest).toEqual({ sha256: "a".repeat(64) });
  });
});

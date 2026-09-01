import { describe, expect, it } from "vitest";
import { createExposureCsvArtifact, readExposureCsvArtifact } from "./exposureCsvArtifact";

describe("artefato CSV de exposição", () => {
  const rows = [{ exposure_id: "EXP-1", description: "Pagamento, USD", currency: "USD", direction: "PAYABLE" as const, notional: 100000, cashflow_date: "2026-10-01", created_at_utc: "2026-08-17T00:00:00.000Z" }];

  it("preserva exposições, linhagem e hash no round-trip CSV", async () => {
    const artifact = await createExposureCsvArtifact(rows, [{ source_id: "BCB_PTAX" }], "2026-08-17T00:00:00.000Z");
    const restored = await readExposureCsvArtifact(artifact.csv, artifact.manifest);
    expect(restored).toEqual(rows);
    expect(artifact.manifest.lineage).toEqual([{ source_id: "BCB_PTAX" }]);
    expect(artifact.manifest.sha256).toHaveLength(64);
  });

  it("rejeita um CSV cujo conteúdo não confere com o hash do manifesto", async () => {
    const artifact = await createExposureCsvArtifact(rows, []);
    await expect(readExposureCsvArtifact(`${artifact.csv}\nEXP-2`, artifact.manifest)).rejects.toThrow("Hash SHA-256");
  });

  it("rejeita manifesto sem linhagem ou data de geração válida", async () => {
    const artifact = await createExposureCsvArtifact(rows, []);
    await expect(readExposureCsvArtifact(artifact.csv, { ...artifact.manifest, lineage: null as unknown as [] })).rejects.toThrow("linhagem exigida");
    await expect(readExposureCsvArtifact(artifact.csv, { ...artifact.manifest, generatedAtUtc: "sem-data" })).rejects.toThrow("data de geração válida");
  });
});

import { describe, expect, it } from "vitest";
import { fetchFgvIgpmPublishedTable } from "./fgvIgpm";

const realSourceTest = process.env.RUN_EXTERNAL_SOURCES === "true" ? it : it.skip;

describe("FGV IGP-M — integração com publicação oficial", () => {
  realSourceTest("interpreta a tabela pública anual sem depender de API privada", async () => {
    const dataset = await fetchFgvIgpmPublishedTable({
      sourceUrl: "https://portal.fgv.br/noticias/igp-m-2026",
      year: 2026,
    });

    expect(dataset.dataframe.length).toBeGreaterThan(0);
    expect(dataset.dataframe.every(row => /^2026\d{2}$/.test(row.period))).toBe(true);
    expect(dataset.lineage.sourceId).toBe("FGV_IGPM");
    expect(dataset.lineage.sourceHashSha256).toMatch(/^[a-f0-9]{64}$/);
  }, 30_000);
});

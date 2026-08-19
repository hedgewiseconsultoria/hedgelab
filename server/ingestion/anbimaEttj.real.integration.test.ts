import { describe, expect, it } from "vitest";
import { fetchAnbimaEttj } from "./anbimaEttj";

const realSourceTest = process.env.RUN_EXTERNAL_SOURCES === "true" ? it : it.skip;

describe("ANBIMA ETTJ — integração com página pública", () => {
  realSourceTest("normaliza vértices e preserva a unidade oficial", async () => {
    const dataset = await fetchAnbimaEttj();

    expect(dataset.dataframe.length).toBeGreaterThan(0);
    expect(dataset.dataframe.every(row => row.unit === "%a.a./252")).toBe(true);
    expect(dataset.dataframe.every(row => row.vertexBusinessDays > 0)).toBe(true);
    expect(dataset.lineage.sourceId).toBe("ANBIMA_ETTJ");
  }, 30_000);
});

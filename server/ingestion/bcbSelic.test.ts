import { describe, expect, it, vi } from "vitest";
import { buildBcbSelicAnnualized252Url, buildBcbSelicSgsUrl, fetchBcbSelicAnnualized252, fetchBcbSelicSgs } from "./bcbSelic";

describe("coletor BCB SGS 11", () => {
  it("monta a URL oficial SGS com período filtrado", () => {
    const url = buildBcbSelicSgsUrl("2026-08-01", "2026-08-03");
    expect(url.toString()).toContain("bcdata.sgs.11/dados");
    expect(url.searchParams.get("dataInicial")).toBe("01/08/2026");
    expect(url.searchParams.get("dataFinal")).toBe("03/08/2026");
  });

  it("normaliza observações oficiais e preserva hash e linhagem", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('[{"data":"01/08/2026","valor":"14,15"}]', { status: 200 }));
    const result = await fetchBcbSelicSgs({ startDate: "2026-08-01", endDate: "2026-08-01" }, fetcher, () => new Date("2026-08-17T00:00:00.000Z"));
    expect(result.dataframe).toEqual([{ observationId: "BCB_SGS_11_2026-08-01_1", asOf: "2026-08-01", valuePct: 14.15, seriesCode: 11, unit: "percent" }]);
    expect(result.lineage).toMatchObject({ sourceId: "BCB_SGS_11_SELIC", sourceAsOf: "2026-08-01", sourceHashSha256: expect.stringMatching(/^[a-f0-9]{64}$/) });
  });

  it("recupera a SGS 1178 diretamente como série anualizada base 252, sem derivá-la da SGS 11", async () => {
    const url = buildBcbSelicAnnualized252Url("2026-08-01", "2026-08-01");
    const fetcher = vi.fn().mockResolvedValue(new Response('[{"data":"01/08/2026","valor":"14.15"}]', { status: 200 }));
    const result = await fetchBcbSelicAnnualized252({ startDate: "2026-08-01", endDate: "2026-08-01" }, fetcher, () => new Date("2026-08-17T00:00:00.000Z"));

    expect(url.toString()).toContain("bcdata.sgs.1178/dados");
    expect(result.dataframe).toEqual([{ observationId: "BCB_SGS_1178_2026-08-01_1", asOf: "2026-08-01", valuePct: 14.15, seriesCode: 1178, unit: "percent" }]);
    expect(result.lineage).toMatchObject({ sourceId: "BCB_SGS_1178_SELIC_AA252", sourceFile: "bcdata.sgs.1178", parserVersion: "bcb-sgs-1178-aa252-v1" });
  });
});

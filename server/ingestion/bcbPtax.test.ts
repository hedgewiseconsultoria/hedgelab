import { describe, expect, it } from "vitest";
import { buildPtaxUsdDayUrl, fetchPtaxUsdDay, formatBcbPtaxDate } from "./bcbPtax";

describe("conector PTAX do BCB", () => {
  it("converte a data para o formato publicado na documentação oficial", () => {
    expect(formatBcbPtaxDate("2026-08-14")).toBe("08-14-2026");
    expect(() => formatBcbPtaxDate("2026-02-30")).toThrow("não é válida");
  });

  it("constrói a URL do recurso CotacaoDolarDia sem criar parâmetros alternativos", () => {
    const url = buildPtaxUsdDayUrl("2026-08-14");

    expect(url.pathname).toContain("CotacaoDolarDia(dataCotacao=@dataCotacao)");
    expect(url.searchParams.get("@dataCotacao")).toBe("'08-14-2026'");
    expect(url.searchParams.get("$format")).toBe("json");
  });

  it("normaliza a resposta do BCB e preserva a linhagem", async () => {
    const fetcher = async () =>
      new Response(
        JSON.stringify({
          value: [
            {
              cotacaoCompra: 5.223,
              cotacaoVenda: 5.2236,
              dataHoraCotacao: "2026-08-14 13:10:22.94166",
            },
          ],
        }),
        { status: 200 },
      );
    const dataset = await fetchPtaxUsdDay("2026-08-14", fetcher, () => new Date("2026-08-17T20:00:00.000Z"));

    expect(dataset.dataframe).toEqual([
      expect.objectContaining({
        asOf: "2026-08-14",
        cotacaoCompra: 5.223,
        cotacaoVenda: 5.2236,
        quoteConvention: "UNIDADE_MONETARIA_CORRENTE_POR_DOLAR_AMERICANO",
      }),
    ]);
    expect(dataset.lineage).toMatchObject({
      sourceId: "BCB_PTAX",
      sourceAsOf: "2026-08-14",
      sourceFile: "CotacaoDolarDia",
      validationStatus: "valid",
    });
    expect(dataset.lineage.sourceHashSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(dataset.availabilityStatus).toBe("quoted");
    expect(dataset.availabilityMessage).toBeNull();
  });

  it("publica indisponibilidade auditável sem fabricar observação ou propagar erro de consulta", async () => {
    const fetcher = async () => new Response(JSON.stringify({ value: [] }), { status: 200 });

    const dataset = await fetchPtaxUsdDay("2026-08-14", fetcher, () => new Date("2026-08-19T12:00:00.000Z"));

    expect(dataset.dataframe).toEqual([]);
    expect(dataset.availabilityStatus).toBe("unavailable");
    expect(dataset.availabilityMessage).toMatch(/não publicou cotação PTAX/i);
    expect(dataset.lineage).toMatchObject({ sourceId: "BCB_PTAX", sourceAsOf: "2026-08-14", validationStatus: "warning" });
    expect(dataset.lineage.sourceHashSha256).toMatch(/^[a-f0-9]{64}$/);
  });
});

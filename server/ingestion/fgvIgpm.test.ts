import { describe, expect, it } from "vitest";
import { fetchFgvIgpmPublishedTable } from "./fgvIgpm";

const OFFICIAL_FORMAT_FIXTURE = `
  <html><body>
    <p>O Índice Geral de Preços - Mercado (IGP-M) é calculado mensalmente pela FGV IBRE.</p>
    <table>
      <thead><tr><th>Mês de referência</th><th>Evolução Mensal</th><th>Acumulado 12 meses</th></tr></thead>
      <tbody>
        <tr><td>jul/26</td><td>−1,16%</td><td>2,76%</td></tr>
        <tr><td>jun/26</td><td>-0,50%</td><td>3,16%</td></tr>
      </tbody>
    </table>
  </body></html>`;

describe("coleta parametrizada de IGP-M da FGV", () => {
  it("normaliza linhas publicadas e preserva a exceção de fonte FGV", async () => {
    const dataset = await fetchFgvIgpmPublishedTable(
      { sourceUrl: "https://portal.fgv.br/noticias/igp-m-2026", year: 2026 },
      async () => new Response(OFFICIAL_FORMAT_FIXTURE, { status: 200 }),
      () => new Date("2026-08-17T20:00:00.000Z"),
    );

    expect(dataset.dataframe).toEqual([
      expect.objectContaining({ period: "202607", monthlyVariationPct: -1.16, trailingTwelveMonthsPct: 2.76 }),
      expect.objectContaining({ period: "202606", monthlyVariationPct: -0.5, trailingTwelveMonthsPct: 3.16 }),
    ]);
    expect(dataset.lineage).toMatchObject({ sourceId: "FGV_IGPM", validationStatus: "valid" });
  });

  it("recusa fonte que não seja o portal oficial da FGV", async () => {
    await expect(
      fetchFgvIgpmPublishedTable(
        { sourceUrl: "https://example.com/igpm", year: 2026 },
        async () => new Response(OFFICIAL_FORMAT_FIXTURE, { status: 200 }),
      ),
    ).rejects.toThrow("domínio oficial");
  });

  it("recusa página sem a tabela validada", async () => {
    await expect(
      fetchFgvIgpmPublishedTable(
        { sourceUrl: "https://portal.fgv.br/noticias/igp-m-2026", year: 2026 },
        async () => new Response("<html><body>sem tabela</body></html>", { status: 200 }),
      ),
    ).rejects.toThrow("não confirmou");
  });
});

import { describe, expect, it } from "vitest";
import { fetchAnbimaEttj, parseAnbimaEttjHtml } from "./anbimaEttj";

const ETTJ_FIXTURE = `
  <html><body>
    <table><tr><td>14/08/2026</td><td>Beta 1</td></tr></table>
    <h2>ETTJ / Inflação Implicita (IPCA) (%a.a./252)</h2>
    <table>
      <thead><tr><th>Vértices</th><th>ETTJ IPCA</th><th>ETTJ PRE</th><th>Inflação Implícita</th></tr></thead>
      <tbody>
        <tr><td>126</td><td>7,5164</td><td>13,5719</td><td>5,6321</td></tr>
        <tr><td>1.008</td><td>8,2977</td><td>14,7590</td><td>5,9662</td></tr>
      </tbody>
    </table>
  </body></html>`;

describe("coleta ETTJ pública da ANBIMA", () => {
  it("normaliza os vértices e preserva a unidade publicada", () => {
    expect(parseAnbimaEttjHtml(ETTJ_FIXTURE)).toEqual([
      {
        asOf: "2026-08-14",
        vertexBusinessDays: 126,
        ettjIpcaPctAa252: 7.5164,
        ettjPrePctAa252: 13.5719,
        impliedInflationPctAa252: 5.6321,
        unit: "%a.a./252",
      },
      expect.objectContaining({ vertexBusinessDays: 1008, ettjPrePctAa252: 14.759 }),
    ]);
  });

  it("recusa a página sem a unidade e o contexto de curva confirmados", () => {
    expect(() => parseAnbimaEttjHtml("<table><tr><td>126</td></tr></table>")).toThrow("não confirmou");
  });

  it("preserva fonte e hash da página consultada", async () => {
    const dataset = await fetchAnbimaEttj(
      async () => new Response(ETTJ_FIXTURE, { status: 200 }),
      () => new Date("2026-08-17T20:00:00.000Z"),
    );

    expect(dataset.lineage).toMatchObject({ sourceId: "ANBIMA_ETTJ", sourceAsOf: "2026-08-14" });
    expect(dataset.lineage.sourceHashSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("suporta o conteúdo latin1 quando a fonte não informa charset", async () => {
    const latin1Fixture = Buffer.from(ETTJ_FIXTURE, "latin1");
    const dataset = await fetchAnbimaEttj(async () => new Response(latin1Fixture, { status: 200 }));

    expect(dataset.dataframe[0]).toMatchObject({ vertexBusinessDays: 126, ettjIpcaPctAa252: 7.5164 });
  });
});

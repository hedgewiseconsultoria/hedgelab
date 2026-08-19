import { describe, expect, it } from "vitest";
import { buildIbgeIpcaMonthlyDataUrl, fetchIbgeIpcaIndexNumber, fetchIbgeIpcaMonthlyVariation } from "./ibgeIpca";

const metadataResponse = {
  id: 1737,
  nome: "IPCA",
  periodicidade: { frequencia: "mensal" },
  variaveis: [{ id: 63, nome: "IPCA - Variação mensal", unidade: "%" }],
};

const dataResponse = [
  {
    id: "63",
    variavel: "IPCA - Variação mensal",
    unidade: "%",
    resultados: [
      {
        series: [
          {
            localidade: { id: "1", nome: "Brasil", nivel: { id: "N1", nome: "Brasil" } },
            serie: { "202607": "0.07" },
          },
        ],
      },
    ],
  },
];

describe("conector IPCA do IBGE", () => {
  it("constrói a consulta da tabela e variável oficialmente validadas", () => {
    const url = buildIbgeIpcaMonthlyDataUrl("202607");

    expect(url.pathname).toContain("/1737/periodos/202607/variaveis/63");
    expect(url.searchParams.get("localidades")).toBe("N1[all]");
    expect(() => buildIbgeIpcaMonthlyDataUrl("202613")).toThrow("mês inválido");
  });

  it("valida metadados e normaliza uma observação mensal do IPCA", async () => {
    let calls = 0;
    const fetcher = async () => {
      calls += 1;
      return new Response(JSON.stringify(calls === 1 ? metadataResponse : dataResponse), { status: 200 });
    };
    const dataset = await fetchIbgeIpcaMonthlyVariation(
      "202607",
      fetcher,
      () => new Date("2026-08-17T20:00:00.000Z"),
    );

    expect(dataset.dataframe).toEqual([
      expect.objectContaining({
        observationId: "IBGE_IPCA_1737_63_1_202607",
        value: 0.07,
        unit: "%",
        localityName: "Brasil",
      }),
    ]);
    expect(dataset.lineage).toMatchObject({
      sourceId: "IBGE_IPCA",
      validationStatus: "valid",
      sourceAsOf: "2026-07-01",
    });
  });

  it("não converte símbolo de indisponibilidade em número", async () => {
    const unavailableData = structuredClone(dataResponse);
    unavailableData[0]!.resultados[0]!.series[0]!.serie["202607"] = "...";
    let calls = 0;
    const fetcher = async () => {
      calls += 1;
      return new Response(JSON.stringify(calls === 1 ? metadataResponse : unavailableData), { status: 200 });
    };

    const dataset = await fetchIbgeIpcaMonthlyVariation("202607", fetcher);
    expect(dataset.dataframe[0]).toMatchObject({ value: null, unavailableSymbol: "..." });
    expect(dataset.lineage.validationStatus).toBe("warning");
  });

  it("valida e normaliza o número-índice oficial 2266 sem confundi-lo com a variação mensal", async () => {
    const indexMetadata = { ...metadataResponse, variaveis: [{ id: 2266, nome: "IPCA - Número-índice", unidade: "Número-índice" }] };
    const indexData = [{ id: "2266", variavel: "IPCA - Número-índice", unidade: "Número-índice", resultados: [{ series: [{ localidade: { id: "1", nome: "Brasil", nivel: { id: "N1", nome: "Brasil" } }, serie: { "202607": "7045.63" } }] }] }];
    let calls = 0;
    const fetcher = async () => {
      calls += 1;
      return new Response(JSON.stringify(calls === 1 ? indexMetadata : indexData), { status: 200 });
    };
    const dataset = await fetchIbgeIpcaIndexNumber("202607", fetcher, () => new Date("2026-08-19T00:00:00.000Z"));
    expect(dataset.dataframe).toEqual([expect.objectContaining({ observationId: "IBGE_IPCA_1737_2266_1_202607", value: 7045.63, unit: "Número-índice" })]);
    expect(dataset.lineage).toMatchObject({ sourceId: "IBGE_IPCA", sourceAsOf: "2026-07-01", parserVersion: "ibge-sidra-agregados-v3-1737-index-v1" });
  });
});

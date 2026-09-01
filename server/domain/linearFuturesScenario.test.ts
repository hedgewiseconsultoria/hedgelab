import { describe, expect, it } from "vitest";
import { calculateLinearFuturesScenario } from "./linearFuturesScenario";

const parametrizedLineage = { sourceId: "USER_PARAMETERIZED_SCENARIO" as const, sourceFile: "cenario-aula", sourceHashSha256: null, sourceAsOf: "2026-08-18", createdAtUtc: "2026-08-18T00:00:00.000Z" };

describe("cenário linear de futuros", () => {
  it("contrapõe compra física e posição comprada no futuro com unidades declaradas", () => {
    const result = calculateLinearFuturesScenario({ scenarioId: "CEN-1", instrumentLabel: "DOL", economicDirection: "BUY", hedgePosition: "LONG", exposureQuantity: 100_000, hedgeContracts: 2, contractUnitQuantity: 50_000, initialPrice: 5.1, scenarioPrice: 5.3, quotationUnit: "BRL por USD", dataMode: "USER_PARAMETERIZED_SCENARIO", lineage: parametrizedLineage });
    expect(result).toMatchObject({ unhedgedEconomicResult: -20_000, futuresResult: 20_000, combinedResult: 0, hedgeCoverageRatio: 1 });
    expect(result.limitations.join(" ")).toContain("não substituem observações B3");
  });

  it("preserva resultado residual quando a cobertura é parcial", () => {
    const result = calculateLinearFuturesScenario({ scenarioId: "CEN-2", instrumentLabel: "CCM", economicDirection: "SELL", hedgePosition: "SHORT", exposureQuantity: 1_000, hedgeContracts: 1, contractUnitQuantity: 500, initialPrice: 70, scenarioPrice: 60, quotationUnit: "BRL por unidade", dataMode: "USER_PARAMETERIZED_SCENARIO", lineage: parametrizedLineage });
    expect(result).toMatchObject({ unhedgedEconomicResult: -10_000, futuresResult: 5_000, residualResult: -5_000, hedgeCoverageRatio: 0.5 });
  });

  it("recusa preço observado B3 sem a trilha de auditoria exigida", () => {
    expect(() => calculateLinearFuturesScenario({ scenarioId: "CEN-3", instrumentLabel: "DOL", economicDirection: "SELL", hedgePosition: "SHORT", exposureQuantity: 1, hedgeContracts: 1, contractUnitQuantity: 1, initialPrice: 5, scenarioPrice: 5.1, quotationUnit: "BRL por USD", dataMode: "B3_OBSERVED_PRICES", lineage: { ...parametrizedLineage, sourceId: "B3_PUBLIC_FILES", sourceFile: "PR.xml" } })).toThrow("arquivo, hash e data-base B3");
  });

  it("bloqueia DI1 e FRA no cenário linear para não substituir cálculo por PU e curva", () => {
    expect(() => calculateLinearFuturesScenario({ scenarioId: "CEN-4", instrumentLabel: "DI1", economicDirection: "SELL", hedgePosition: "SHORT", exposureQuantity: 1, hedgeContracts: 1, contractUnitQuantity: 1, initialPrice: 14, scenarioPrice: 13, quotationUnit: "% a.a.", dataMode: "USER_PARAMETERIZED_SCENARIO", lineage: parametrizedLineage })).toThrow("não se aplica a DI1 ou FRA");
  });

  it("exige data-base mesmo quando os preços são parâmetros didáticos", () => {
    expect(() => calculateLinearFuturesScenario({ scenarioId: "CEN-5", instrumentLabel: "DOL", economicDirection: "BUY", hedgePosition: "LONG", exposureQuantity: 1, hedgeContracts: 1, contractUnitQuantity: 1, initialPrice: 5, scenarioPrice: 5.1, quotationUnit: "BRL por USD", dataMode: "USER_PARAMETERIZED_SCENARIO", lineage: { ...parametrizedLineage, sourceAsOf: null } })).toThrow("data-base explícita");
  });
});

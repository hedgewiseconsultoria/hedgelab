import { describe, expect, it } from "vitest";
import { calculateCommodityStrategyScenario } from "./commodityStrategyScenario";

describe("cenário comparativo de estratégia de commodity", () => {
  it("compensa proporcionalmente o aumento de custo de compra com futuro comprado", () => {
    const result = calculateCommodityStrategyScenario({ economicDirection: "BUY", strategy: "FUTURE", exposureQuantity: 100, coveragePct: 50, referencePrice: 10, scenarioPrice: 12 });
    expect(result).toMatchObject({ coveredQuantity: 50, residualQuantity: 50, physicalEconomicImpact: -200, hedgeEconomicImpact: 100, combinedEconomicImpact: -100, methodStatus: "didactic_user_parameterized" });
  });

  it("protege uma receita de venda com futuro vendido quando o preço cai", () => {
    const result = calculateCommodityStrategyScenario({ economicDirection: "SELL", strategy: "FUTURE", exposureQuantity: 80, coveragePct: 100, referencePrice: 25, scenarioPrice: 20 });
    expect(result).toMatchObject({ physicalEconomicImpact: -400, hedgeEconomicImpact: 400, combinedEconomicImpact: 0 });
  });

  it("calcula apenas o intrínseco de uma call protetiva sem atribuir prêmio ou MTM", () => {
    const result = calculateCommodityStrategyScenario({ economicDirection: "BUY", strategy: "PROTECTIVE_OPTION", exposureQuantity: 100, coveragePct: 60, referencePrice: 10, scenarioPrice: 15, optionStrike: 12 });
    expect(result).toMatchObject({ hedgeEconomicImpact: 180, combinedEconomicImpact: -320 });
    expect(result.limitations.join(" ")).toContain("não inclui prêmio");
  });

  it("rejeita percentuais de cobertura fora do intervalo didático", () => {
    expect(() => calculateCommodityStrategyScenario({ economicDirection: "SELL", strategy: "UNHEDGED", exposureQuantity: 1, coveragePct: 120, referencePrice: 1, scenarioPrice: 2 })).toThrow("entre 0% e 100%");
  });
});

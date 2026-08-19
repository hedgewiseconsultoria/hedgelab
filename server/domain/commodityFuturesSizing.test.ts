import { describe, expect, it } from "vitest";
import { sizeB3CommodityFutureHedge } from "./commodityFuturesSizing";

describe("dimensionamento físico de futuros B3 de commodities", () => {
  it("dimensiona milho apenas em sacas de 60 kg", () => {
    expect(sizeB3CommodityFutureHedge({ contract: "CCM", exposureQuantity: 1_000, exposureUnit: "SACA_60KG", roundingPolicy: "NEAREST" })).toMatchObject({ contracts: 2, contractUnitQuantity: 450, hedgedQuantity: 900, residualQuantity: 100, coverageRatio: 0.9 });
  });

  it("rejeita a conversão implícita entre tonelada e saca", () => {
    expect(() => sizeB3CommodityFutureHedge({ contract: "CCM", exposureQuantity: 27, exposureUnit: "METRIC_TON", roundingPolicy: "NEAREST" })).toThrow("nenhuma conversão automática");
  });
});

import { describe, expect, it } from "vitest";
import { sizeB3CommodityOptionReference } from "./commodityOptionSizing";

describe("dimensionamento físico de opção de commodity", () => {
  it("dimensiona apenas a equivalência máxima do futuro-objeto CCM na mesma unidade", () => {
    const result = sizeB3CommodityOptionReference({ contract: "CCM", exposureQuantity: 1_000, exposureUnit: "SACA_60KG", roundingPolicy: "NEAREST" });

    expect(result).toMatchObject({ contracts: 2, contractUnitQuantity: 450, referencedUnderlyingQuantity: 900, residualQuantity: 100, coverageRatio: 0.9 });
    expect(result.limitation).toMatch(/não representa delta, prêmio/i);
  });

  it("rejeita conversão implícita de unidade", () => {
    expect(() => sizeB3CommodityOptionReference({ contract: "SOY", exposureQuantity: 34, exposureUnit: "SACA_60KG", roundingPolicy: "NEAREST" })).toThrow(/nenhuma conversão automática/i);
  });
});

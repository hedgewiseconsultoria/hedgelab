import { describe, expect, it } from "vitest";
import { sizeB3FxFutureHedge } from "./fxFuturesHedge";

describe("dimensionamento de futuros de câmbio B3", () => {
  it("dimensiona WDO com a política de arredondamento declarada", () => {
    const result = sizeB3FxFutureHedge({
      exposureUsd: 125_000,
      economicDirection: "PAYABLE",
      contract: "WDO",
      roundingPolicy: "NEAREST",
    });

    expect(result).toMatchObject({
      contractSizeUsd: 10_000,
      rawContracts: 12.5,
      contracts: 13,
      hedgedUsd: 130_000,
      residualUsd: -5_000,
      economicDirection: "PAYABLE",
    });
    expect(result.sourceUrl).toContain("futuro-mini-de-taxa-de-cambio");
  });

  it("preserva o residual quando a política escolhe arredondar para baixo", () => {
    const result = sizeB3FxFutureHedge({
      exposureUsd: 125_000,
      economicDirection: "RECEIVABLE",
      contract: "DOL",
      roundingPolicy: "FLOOR",
    });

    expect(result.contracts).toBe(2);
    expect(result.hedgedUsd).toBe(100_000);
    expect(result.residualUsd).toBe(25_000);
  });

  it("não aceita exposição nula ou negativa", () => {
    expect(() => sizeB3FxFutureHedge({ exposureUsd: 0, economicDirection: "PAYABLE", contract: "WDO", roundingPolicy: "NEAREST" })).toThrow("positiva");
  });
});

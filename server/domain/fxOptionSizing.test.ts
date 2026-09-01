import { describe, expect, it } from "vitest";
import { sizeB3DollarOptionReference } from "./fxOptionSizing";

describe("dimensionamento de referência da opção DOL", () => {
  it("dimensiona a referência máxima por equivalência nocional USD", () => {
    const result = sizeB3DollarOptionReference({ exposureUsd: 120_000, roundingPolicy: "NEAREST" });
    expect(result).toMatchObject({ contract: "DOL_OPTION", contractSizeUsd: 50_000, contracts: 2, referencedUsd: 100_000, residualUsd: 20_000, coverageRatio: 100_000 / 120_000 });
    expect(result.limitation).toMatch(/não representa delta, prêmio/i);
  });
});

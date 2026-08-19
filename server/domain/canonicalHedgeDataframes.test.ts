import { describe, expect, it } from "vitest";
import { materializeCanonicalHedgeDataframes } from "./canonicalHedgeDataframes";
import { diagnoseHedgeAlternatives } from "./hedgeAlternatives";

describe("materializeCanonicalHedgeDataframes", () => {
  it("materializa situação, fator, alternativas e dimensionamentos pendentes sem inventar preço, contrato ou resultado", () => {
    const diagnosis = diagnoseHedgeAlternatives({ exposureId: "usd-payable-1", kind: "USD_PAYABLE", description: "Importação", notional: 100_000, currency: "USD", maturityDate: "2026-12-15" });
    const frames = materializeCanonicalHedgeDataframes(diagnosis, "2026-08-18T00:00:00.000Z");
    expect(frames.economic_situation_dataframe).toMatchObject([{ exposure_id: "usd-payable-1", origin: "USER_DECLARED", horizon_date: "2026-12-15" }]);
    expect(frames.risk_factor_dataframe).toMatchObject([{ risk_factor: "USD_BRL", hedge_direction: "BUY" }]);
    expect(frames.hedge_alternative_dataframe).toHaveLength(5);
    expect(frames.hedge_sizing_dataframe.every(row => row.hedge_quantity === null && row.sizing_status === "pending_required_data")).toBe(true);
    expect(frames.scenario_result_dataframe).toEqual([]);
  });
});

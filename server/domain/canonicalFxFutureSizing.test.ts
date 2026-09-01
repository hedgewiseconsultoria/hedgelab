import { describe, expect, it } from "vitest";
import { attachCanonicalFxFutureSizing } from "./canonicalFxFutureSizing";
import { emptyCanonicalHedgeDataframes } from "./canonicalHedgeDataframes";

describe("attachCanonicalFxFutureSizing", () => {
  it("publica apenas quando alternativa e especificação DOL oficial estão presentes", () => {
    const frames = emptyCanonicalHedgeDataframes();
    frames.hedge_alternative_dataframe = [{ alternative_id: "alt-dol", exposure_id: "exp-usd", alternative_kind: "B3_DOL_FUTURE", label: "DOL", risk_factor: "USD_BRL", hedge_direction: "BUY", eligibility_status: "eligible_with_market_data", required_data: [], blocking_reason: null, source_ids: ["B3_PUBLIC_FILES"], method_version: "hedge-alternatives-v1", economic_situation_id: "eco-usd", risk_factor_id: "risk-usd", origin: "CATALOG_DERIVED" }];
    const instruments = [{ instrument_id: "spec-dol", instrument_key: "DOL", product_kind: "B3_FX_FUTURE", description: "DOL", terms: {}, source: "B3_PRODUCT_SPECIFICATION", evidence_source_file: "b3-dol", evidence_source_url: "https://www.b3.com.br", evidence_sha256: "a".repeat(64), evidence_captured_at_utc: "2026-08-18T00:00:00.000Z", validation_status: "official_specification_loaded", series_status: "no_b3_series_selected" }] as const;
    const result = attachCanonicalFxFutureSizing(frames, { exposureId: "exp-usd", contract: "DOL", roundingPolicy: "NEAREST", contracts: 3, coverageRatio: 0.95 }, instruments as never);
    expect(result.hedge_sizing_dataframe).toMatchObject([{ alternative_id: "alt-dol", sizing_status: "sized", coverage_target_pct: 95, hedge_quantity: 3, hedge_unit: "contrato DOL" }]);
  });

  it("mantém o DataFrame inalterado sem especificação oficial", () => {
    const frames = emptyCanonicalHedgeDataframes();
    expect(attachCanonicalFxFutureSizing(frames, { exposureId: "exp-usd", contract: "WDO", roundingPolicy: "NEAREST", contracts: 1, coverageRatio: 1 }, [])).toBe(frames);
  });

  it("limita o campo percentual canônico e preserva a sobrecobertura na limitação auditável", () => {
    const frames = emptyCanonicalHedgeDataframes();
    frames.hedge_alternative_dataframe = [{ alternative_id: "alt-wdo", exposure_id: "exp-usd", alternative_kind: "B3_WDO_FUTURE", label: "WDO", risk_factor: "USD_BRL", hedge_direction: "BUY", eligibility_status: "eligible_with_market_data", required_data: [], blocking_reason: null, source_ids: ["B3_PUBLIC_FILES"], method_version: "hedge-alternatives-v1", economic_situation_id: "eco-usd", risk_factor_id: "risk-usd", origin: "CATALOG_DERIVED" }];
    const instruments = [{ instrument_id: "spec-wdo", instrument_key: "WDO", product_kind: "B3_FX_FUTURE", description: "WDO", terms: {}, source: "B3_PRODUCT_SPECIFICATION", evidence_source_file: "b3-wdo", evidence_source_url: "https://www.b3.com.br", evidence_sha256: "b".repeat(64), evidence_captured_at_utc: "2026-08-18T00:00:00.000Z", validation_status: "official_specification_loaded", series_status: "no_b3_series_selected" }] as const;
    const result = attachCanonicalFxFutureSizing(frames, { exposureId: "exp-usd", contract: "WDO", roundingPolicy: "CEILING", contracts: 2, coverageRatio: 1.25 }, instruments as never);
    expect(result.hedge_sizing_dataframe[0]).toMatchObject({ coverage_target_pct: 100, hedge_quantity: 2 });
    expect(result.hedge_sizing_dataframe[0]?.blocking_reason).toContain("125.000000%");
  });
});

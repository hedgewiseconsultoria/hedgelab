import { describe, expect, it } from "vitest";
import { emptyCanonicalHedgeDataframes } from "./canonicalHedgeDataframes";
import { attachCanonicalCommodityFutureSizing } from "./canonicalCommodityFutureSizing";

describe("publicação canônica de dimensionamento de commodity", () => {
  it("publica milho somente com unidade SACA_60KG e especificação CCM em sessão", () => {
    const frames = emptyCanonicalHedgeDataframes();
    frames.economic_situation_dataframe.push({ economic_situation_id: "sit-ccm", exposure_id: "exp-ccm", situation_kind: "COMMODITY_PURCHASE", description: "Milho", declared_quantity: 1_000, declared_currency: "BRL", horizon_date: "2026-12-15", commodity_reference: "CCM", indexer: null, origin: "USER_DECLARED", captured_at_utc: "2026-08-18T00:00:00.000Z" });
    frames.hedge_alternative_dataframe.push({ alternative_id: "alt-ccm", exposure_id: "exp-ccm", alternative_kind: "B3_COMMODITY_FUTURE", label: "Futuro CCM", risk_factor: "B3_COMMODITY_PRICE", hedge_direction: "BUY", eligibility_status: "eligible_with_market_data", required_data: ["série"], blocking_reason: null, source_ids: ["B3_PUBLIC_FILES"], method_version: "hedge-alternatives-v1", economic_situation_id: "sit-ccm", risk_factor_id: "risk-ccm", origin: "CATALOG_DERIVED" });
    const master = [{ instrument_id: "B3_PRODUCT_SPEC::CCM", instrument_key: "CCM", product_kind: "B3_COMMODITY_FUTURE", description: "Milho", terms: {}, source: "B3_PRODUCT_SPECIFICATION", evidence_source_file: "ccm.html", evidence_source_url: "https://www.b3.com.br/ccm", evidence_sha256: "a".repeat(64), evidence_captured_at_utc: "2026-08-18T00:00:00.000Z", validation_status: "official_specification_loaded", series_status: "no_b3_series_selected" } as const];
    const next = attachCanonicalCommodityFutureSizing(frames, { alternativeId: "alt-ccm", economicSituationId: "sit-ccm", contract: "CCM", exposureQuantity: 1_000, exposureUnit: "SACA_60KG", roundingPolicy: "NEAREST", contracts: 2, coverageRatio: 0.9 }, master);
    expect(next.hedge_sizing_dataframe).toMatchObject([{ alternative_id: "alt-ccm", hedge_quantity: 2, coverage_target_pct: 90, hedge_unit: "contrato CCM" }]);
    expect(attachCanonicalCommodityFutureSizing(frames, { alternativeId: "alt-ccm", economicSituationId: "sit-ccm", contract: "CCM", exposureQuantity: 1_000, exposureUnit: "METRIC_TON", roundingPolicy: "NEAREST", contracts: 2, coverageRatio: 0.9 }, master)).toBe(frames);
  });
});

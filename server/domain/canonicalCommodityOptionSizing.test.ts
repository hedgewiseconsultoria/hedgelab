import { describe, expect, it } from "vitest";
import { emptyCanonicalHedgeDataframes } from "./canonicalHedgeDataframes";
import { attachCanonicalCommodityOptionSizing } from "./canonicalCommodityOptionSizing";

describe("publicação canônica de cobertura física de opção de commodity", () => {
  it("publica CCM somente com ficha de opção e observação B3 de opção selecionada", () => {
    const frames = emptyCanonicalHedgeDataframes();
    frames.economic_situation_dataframe.push({ economic_situation_id: "sit-ccm", exposure_id: "exp-ccm", situation_kind: "COMMODITY_PURCHASE", description: "Milho", declared_quantity: 1_000, declared_currency: "BRL", horizon_date: "2026-12-15", commodity_reference: "CCM", indexer: null, origin: "USER_DECLARED", captured_at_utc: "2026-08-18T00:00:00.000Z" });
    frames.hedge_alternative_dataframe.push({ alternative_id: "alt-ccm-option", exposure_id: "exp-ccm", alternative_kind: "B3_COMMODITY_OPTION", label: "Opção CCM", risk_factor: "B3_COMMODITY_PRICE", hedge_direction: "BUY", eligibility_status: "eligible_with_market_data", required_data: ["série"], blocking_reason: null, source_ids: ["B3_PUBLIC_FILES", "B3_PRODUCT_SPECIFICATION"], method_version: "hedge-alternatives-v1", economic_situation_id: "sit-ccm", risk_factor_id: "risk-ccm", origin: "CATALOG_DERIVED" });
    frames.b3_observation_link_dataframe.push({ observation_link_id: "obs-ccm", alternative_id: "alt-ccm-option", family: "CCM", symbol: "CCMX26C", instrument_id: "ccm-option", instrument_type: "OPTION", maturity: "2026-12-15", option_type: "CALL", exercise_price: 65, observed_prices: { last_price: null, trade_average_price: null, adjusted_quote: 1, adjusted_quote_tax: null }, price_source: { report_type: "BVBG.086.01", source_url: "https://www.b3.com.br", source_file: "price.xml", source_asof: "2026-08-13", source_hash_sha256: "a".repeat(64), normalized_csv_storage_key: "b3/normalized/price.csv", normalized_csv_sha256: "b".repeat(64), normalized_manifest_storage_key: "b3/normalized/price.manifest.json" }, instrument_source: { source_url: "https://www.b3.com.br", source_file: "instrument.xml", source_asof: "2026-08-13", source_hash_sha256: "c".repeat(64), normalized_csv_storage_key: "b3/normalized/instrument.csv", normalized_csv_sha256: "d".repeat(64), normalized_manifest_storage_key: "b3/normalized/instrument.manifest.json" }, association_status: "valid_same_asof", selected_at_utc: "2026-08-18T00:00:00.000Z", method_version: "b3-observation-selection-v1" });
    const master = [{ instrument_id: "B3_PRODUCT_SPEC::CCM_OPTION", instrument_key: "CCM_OPTION", product_kind: "B3_COMMODITY_OPTION", description: "Opção CCM", terms: {}, source: "B3_PRODUCT_SPECIFICATION", evidence_source_file: "ccm-option.html", evidence_source_url: "https://www.b3.com.br/ccm-option", evidence_sha256: "e".repeat(64), evidence_captured_at_utc: "2026-08-18T00:00:00.000Z", validation_status: "official_specification_loaded", series_status: "no_b3_series_selected" } as const];

    const next = attachCanonicalCommodityOptionSizing(frames, { alternativeId: "alt-ccm-option", economicSituationId: "sit-ccm", contract: "CCM", exposureQuantity: 1_000, exposureUnit: "SACA_60KG", roundingPolicy: "NEAREST", optionPosition: "LONG", optionType: "CALL", contracts: 2, coverageRatio: 0.9 }, master);

    expect(next.hedge_sizing_dataframe).toMatchObject([{ alternative_id: "alt-ccm-option", hedge_quantity: 2, coverage_target_pct: 90, hedge_unit: "opção CCM (LONG CALL)" }]);
  });

  it("bloqueia a publicação sem observação B3 de opção", () => {
    const frames = emptyCanonicalHedgeDataframes();
    expect(attachCanonicalCommodityOptionSizing(frames, { alternativeId: "absente", economicSituationId: "absente", contract: "CCM", exposureQuantity: 1_000, exposureUnit: "SACA_60KG", roundingPolicy: "NEAREST", optionPosition: "LONG", optionType: "CALL", contracts: 2, coverageRatio: 0.9 }, [])).toBe(frames);
  });
});

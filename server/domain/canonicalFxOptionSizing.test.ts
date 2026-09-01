import { describe, expect, it } from "vitest";
import { emptyCanonicalHedgeDataframes } from "./canonicalHedgeDataframes";
import { attachCanonicalFxOptionSizing } from "./canonicalFxOptionSizing";

describe("publicação canônica de referência nocional da opção DOL", () => {
  it("exige ficha DOL_OPTION e observação B3 de opção da própria alternativa", () => {
    const frames = emptyCanonicalHedgeDataframes();
    frames.economic_situation_dataframe.push({ economic_situation_id: "sit-usd", exposure_id: "exp-usd", situation_kind: "USD_PAYABLE", description: "Importação", declared_quantity: 120_000, declared_currency: "USD", horizon_date: "2026-12-01", commodity_reference: null, indexer: null, origin: "USER_DECLARED", captured_at_utc: "2026-08-18T00:00:00.000Z" });
    frames.hedge_alternative_dataframe.push({ alternative_id: "alt-dol-option", exposure_id: "exp-usd", alternative_kind: "B3_DOL_OPTION", label: "Opção DOL", risk_factor: "USD_BRL", hedge_direction: "BUY", eligibility_status: "eligible_with_market_data", required_data: ["série"], blocking_reason: null, source_ids: ["B3_PUBLIC_FILES", "B3_PRODUCT_SPECIFICATION"], method_version: "hedge-alternatives-v1", economic_situation_id: "sit-usd", risk_factor_id: "risk-usd", origin: "CATALOG_DERIVED" });
    (frames.b3_observation_link_dataframe ??= []).push({ alternative_id: "alt-dol-option", family: "DOL", symbol: "DOLX26C", instrument_type: "OPTION" } as any);
    const master = [{ instrument_id: "B3_PRODUCT_SPEC::DOL_OPTION", instrument_key: "DOL_OPTION", product_kind: "B3_FX_OPTION", description: "Opção DOL", terms: {}, source: "B3_PRODUCT_SPECIFICATION", evidence_source_file: "dol-option.html", evidence_source_url: "https://www.b3.com.br/dol-option", evidence_sha256: "a".repeat(64), evidence_captured_at_utc: "2026-08-18T00:00:00.000Z", validation_status: "official_specification_loaded", series_status: "no_b3_series_selected" } as const];
    const next = attachCanonicalFxOptionSizing(frames, { exposureId: "exp-usd", roundingPolicy: "NEAREST", optionPosition: "LONG", optionType: "CALL", contracts: 2, coverageRatio: 100_000 / 120_000 }, master);
    expect(next.hedge_sizing_dataframe).toMatchObject([{ alternative_id: "alt-dol-option", hedge_quantity: 2, hedge_unit: "opção DOL (LONG CALL)" }]);
  });
});

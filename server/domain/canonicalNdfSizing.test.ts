import { describe, expect, it } from "vitest";
import { emptyCanonicalHedgeDataframes } from "./canonicalHedgeDataframes";
import { attachCanonicalNdfSizing } from "./canonicalNdfSizing";

describe("attachCanonicalNdfSizing", () => {
  it("publica a cobertura NDF apenas com contrato validado, designação e vencimento econômico coincidente", () => {
    const frames = emptyCanonicalHedgeDataframes();
    frames.economic_situation_dataframe.push({ economic_situation_id: "sit-usd", exposure_id: "exp-usd", situation_kind: "USD_PAYABLE", description: "Importação", declared_quantity: 100_000, declared_currency: "USD", horizon_date: "2026-09-01", commodity_reference: null, indexer: null, origin: "USER_DECLARED", captured_at_utc: "2026-08-18T00:00:00.000Z" });
    frames.hedge_alternative_dataframe.push({ alternative_id: "alt-ndf", exposure_id: "exp-usd", alternative_kind: "OTC_NDF_OR_TERM", label: "NDF", risk_factor: "USD_BRL", hedge_direction: "BUY", eligibility_status: "contract_required", required_data: ["contrato"], blocking_reason: "Contrato obrigatório", source_ids: ["USER_CONTRACT"], method_version: "hedge-alternatives-v1", economic_situation_id: "sit-usd", risk_factor_id: "risk-usd", origin: "CATALOG_DERIVED" });
    const next = attachCanonicalNdfSizing(frames, {
      instrumentMasterRows: [{ instrument_id: "NDF-001", kind: "OTC_NDF", base_currency: "USD", quote_currency: "BRL", notional_base_currency: 100_000, trade_date: "2026-08-01", maturity: "2026-09-01", settlement_convention: "D+1", terms: {}, source: "USER_CONTRACT", evidence_source_file: "ndf.pdf", evidence_source_url: null, evidence_sha256: "a".repeat(64), evidence_captured_at_utc: "2026-08-18T00:00:00.000Z", validation_status: "validated_user_contract" }],
      hedgeRows: [{ hedge_id: "hedge-ndf", exposure_id: "exp-usd", instrument_id: "NDF-001", strategy: "NDF_CONTRATUAL", quantity: 1, trade_date: "2026-08-01", maturity: "2026-09-01", method_version: "otc-contract-master-v1" }],
    });
    expect(next.hedge_sizing_dataframe).toMatchObject([{ alternative_id: "alt-ndf", coverage_target_pct: 100, hedge_quantity: 1, hedge_unit: "contrato NDF (100,000 USD)" }]);
  });

  it("mantém o DataFrame intacto quando o vencimento econômico não coincide com o contrato", () => {
    const frames = emptyCanonicalHedgeDataframes();
    frames.economic_situation_dataframe.push({ economic_situation_id: "sit-usd", exposure_id: "exp-usd", situation_kind: "USD_PAYABLE", description: "Importação", declared_quantity: 100_000, declared_currency: "USD", horizon_date: "2026-10-01", commodity_reference: null, indexer: null, origin: "USER_DECLARED", captured_at_utc: "2026-08-18T00:00:00.000Z" });
    frames.hedge_alternative_dataframe.push({ alternative_id: "alt-ndf", exposure_id: "exp-usd", alternative_kind: "OTC_NDF_OR_TERM", label: "NDF", risk_factor: "USD_BRL", hedge_direction: "BUY", eligibility_status: "contract_required", required_data: ["contrato"], blocking_reason: "Contrato obrigatório", source_ids: ["USER_CONTRACT"], method_version: "hedge-alternatives-v1", economic_situation_id: "sit-usd", risk_factor_id: "risk-usd", origin: "CATALOG_DERIVED" });
    const next = attachCanonicalNdfSizing(frames, {
      instrumentMasterRows: [{ instrument_id: "NDF-001", kind: "OTC_NDF", base_currency: "USD", quote_currency: "BRL", notional_base_currency: 100_000, trade_date: "2026-08-01", maturity: "2026-09-01", settlement_convention: "D+1", terms: {}, source: "USER_CONTRACT", evidence_source_file: "ndf.pdf", evidence_source_url: null, evidence_sha256: "a".repeat(64), evidence_captured_at_utc: "2026-08-18T00:00:00.000Z", validation_status: "validated_user_contract" }],
      hedgeRows: [{ hedge_id: "hedge-ndf", exposure_id: "exp-usd", instrument_id: "NDF-001", strategy: "NDF_CONTRATUAL", quantity: 1, trade_date: "2026-08-01", maturity: "2026-09-01", method_version: "otc-contract-master-v1" }],
    });
    expect(next).toBe(frames);
  });
});

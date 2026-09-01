import { describe, expect, it } from "vitest";
import { emptyCanonicalHedgeDataframes } from "./canonicalHedgeDataframes";
import { attachCanonicalFxSwapSizing } from "./canonicalFxSwapSizing";

function framesWithFxSwap() {
  const frames = emptyCanonicalHedgeDataframes();
  frames.economic_situation_dataframe.push({ economic_situation_id: "sit-usd", exposure_id: "exp-usd", situation_kind: "USD_PAYABLE", description: "Importação", declared_quantity: 100_000, declared_currency: "USD", horizon_date: "2026-12-15", commodity_reference: null, indexer: null, origin: "USER_DECLARED", captured_at_utc: "2026-08-19T00:00:00.000Z" });
  frames.hedge_alternative_dataframe.push({ alternative_id: "alt-fx-swap", exposure_id: "exp-usd", alternative_kind: "OTC_FX_SWAP", label: "Swap cambial", risk_factor: "USD_BRL", hedge_direction: "BUY", eligibility_status: "contract_required", required_data: ["contrato"], blocking_reason: "Contrato obrigatório", source_ids: ["USER_CONTRACT", "BCB_PTAX"], method_version: "hedge-alternatives-v1", economic_situation_id: "sit-usd", risk_factor_id: "risk-usd", origin: "CATALOG_DERIVED" });
  return frames;
}

const validMaster = { instrument_id: "SWAP-FX-001", kind: "OTC_FX_SWAP" as const, base_currency: "USD" as const, quote_currency: "BRL" as const, notional_base_currency: 100_000, trade_date: "2026-08-13", maturity: "2026-12-15", settlement_convention: "Financeira conforme contrato", terms: { domesticLegIndex: "CDI", foreignLegIndex: "USD", startDate: "2026-08-14", endDate: "2026-12-15" }, source: "USER_CONTRACT" as const, evidence_source_file: "swap-fx.pdf", evidence_source_url: null, evidence_sha256: "c".repeat(64), evidence_captured_at_utc: "2026-08-19T00:00:00.000Z", validation_status: "validated_user_contract" as const };
const validHedge = { hedge_id: "hedge-fx-swap", exposure_id: "exp-usd", instrument_id: "SWAP-FX-001", strategy: "SWAP_CAMBIAL_CONTRATUAL", quantity: 1, trade_date: "2026-08-13", maturity: "2026-12-15", method_version: "otc-contract-master-v1" };

describe("attachCanonicalFxSwapSizing", () => {
  it("publica a cobertura nocional apenas com contrato USD/BRL, exposição USD, pernas, designação e vencimento coincidente", () => {
    const next = attachCanonicalFxSwapSizing(framesWithFxSwap(), { instrumentMasterRows: [validMaster], hedgeRows: [validHedge] });
    expect(next.hedge_sizing_dataframe).toMatchObject([{ alternative_id: "alt-fx-swap", coverage_target_pct: 100, hedge_quantity: 1, hedge_unit: "contrato de swap cambial (100,000 USD)" }]);
    expect(next.hedge_sizing_dataframe[0]?.blocking_reason).toMatch(/não representa taxa, cupom, preço, MTM/i);
  });

  it("mantém o DataFrame intacto quando uma perna não foi declarada ou o vencimento é divergente", () => {
    const invalidMaster = { ...validMaster, terms: { ...validMaster.terms, foreignLegIndex: "" } };
    const next = attachCanonicalFxSwapSizing(framesWithFxSwap(), { instrumentMasterRows: [invalidMaster], hedgeRows: [{ ...validHedge, maturity: "2027-01-15" }] });
    expect(next.hedge_sizing_dataframe).toEqual([]);
  });
});

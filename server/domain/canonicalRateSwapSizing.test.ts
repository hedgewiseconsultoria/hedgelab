import { describe, expect, it } from "vitest";
import { emptyCanonicalHedgeDataframes } from "./canonicalHedgeDataframes";
import { attachCanonicalRateSwapSizing } from "./canonicalRateSwapSizing";

function framesWithRateSwap() {
  const frames = emptyCanonicalHedgeDataframes();
  frames.economic_situation_dataframe.push({ economic_situation_id: "sit-cdi", exposure_id: "exp-cdi", situation_kind: "CDI_LINKED_DEBT", description: "Dívida CDI", declared_quantity: 5_000_000, declared_currency: "BRL", horizon_date: "2027-08-13", commodity_reference: null, indexer: "CDI", origin: "USER_DECLARED", captured_at_utc: "2026-08-19T00:00:00.000Z" });
  frames.hedge_alternative_dataframe.push({ alternative_id: "alt-rate-swap", exposure_id: "exp-cdi", alternative_kind: "OTC_RATE_SWAP", label: "Swap de taxa bilateral", risk_factor: "CDI_RATE", hedge_direction: "BUY", eligibility_status: "contract_required", required_data: ["contrato"], blocking_reason: "Contrato obrigatório", source_ids: ["USER_CONTRACT"], method_version: "hedge-alternatives-v1", economic_situation_id: "sit-cdi", risk_factor_id: "risk-cdi", origin: "CATALOG_DERIVED" });
  return frames;
}

const validMaster = { instrument_id: "SWAP-CDI-001", kind: "OTC_RATE_SWAP" as const, base_currency: "BRL" as const, quote_currency: "BRL" as const, notional_base_currency: 5_000_000, trade_date: "2026-08-13", maturity: "2027-08-13", settlement_convention: "Financeira conforme contrato", terms: { payerLeg: "PAY_FIXED_RECEIVE_FLOATING" as const, floatingLegIndex: "CDI", fixedLegConvention: "Taxa fixa conforme contrato", paymentSchedule: "Mensal conforme contrato", startDate: "2026-08-14", endDate: "2027-08-13" }, source: "USER_CONTRACT" as const, evidence_source_file: "swap-cdi.pdf", evidence_source_url: null, evidence_sha256: "b".repeat(64), evidence_captured_at_utc: "2026-08-19T00:00:00.000Z", validation_status: "validated_user_contract" as const };
const validHedge = { hedge_id: "hedge-swap", exposure_id: "exp-cdi", instrument_id: "SWAP-CDI-001", strategy: "SWAP_TAXA_CONTRATUAL", quantity: 1, trade_date: "2026-08-13", maturity: "2027-08-13", method_version: "otc-contract-master-v1" };

describe("attachCanonicalRateSwapSizing", () => {
  it("publica apenas a referência nocional com contrato BRL, exposição CDI, designação e vencimento coincidente", () => {
    const next = attachCanonicalRateSwapSizing(framesWithRateSwap(), { instrumentMasterRows: [validMaster], hedgeRows: [validHedge] });
    expect(next.hedge_sizing_dataframe).toMatchObject([{ alternative_id: "alt-rate-swap", coverage_target_pct: 100, hedge_quantity: 1, hedge_unit: "contrato de swap de taxa (5,000,000 BRL)" }]);
    expect(next.hedge_sizing_dataframe[0]?.blocking_reason).toMatch(/não representa taxa, cupom, curva, MTM, DV01 ou resultado financeiro/i);
  });

  it("mantém o DataFrame intacto quando a exposição não é dívida CDI ou o contrato não declara a perna fixa", () => {
    const frames = framesWithRateSwap();
    frames.economic_situation_dataframe[0]!.indexer = null;
    const invalidMaster = { ...validMaster, terms: { ...validMaster.terms, fixedLegConvention: "" } };
    const next = attachCanonicalRateSwapSizing(frames, { instrumentMasterRows: [invalidMaster], hedgeRows: [validHedge] });
    expect(next).toBe(frames);
  });
});

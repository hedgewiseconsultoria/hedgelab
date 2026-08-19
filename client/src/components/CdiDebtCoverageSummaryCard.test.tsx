// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CdiDebtCoverageSummaryCard from "./CdiDebtCoverageSummaryCard";

describe("CdiDebtCoverageSummaryCard", () => {
  it("consolida somente a dívida CDI declarada e a referência nocional já publicada, sem apresentar risco de juros", () => {
    render(<CdiDebtCoverageSummaryCard dataframes={{
      economic_situation_dataframe: [{ economic_situation_id: "sit-cdi", exposure_id: "exp-cdi", situation_kind: "CDI_LINKED_DEBT", description: "Dívida pós-fixada", declared_quantity: 5_000_000, declared_currency: "BRL", horizon_date: "2027-08-13", commodity_reference: null, indexer: "CDI", origin: "USER_DECLARED", captured_at_utc: "2026-08-19T00:00:00.000Z" }],
      risk_factor_dataframe: [], hedge_alternative_dataframe: [{ alternative_id: "alt-rate", exposure_id: "exp-cdi", alternative_kind: "OTC_RATE_SWAP", label: "Swap de taxa", risk_factor: "CDI_RATE", hedge_direction: "BUY", eligibility_status: "contract_required", required_data: ["contrato"], blocking_reason: "Contrato obrigatório", source_ids: ["USER_CONTRACT"], method_version: "hedge-alternatives-v1", economic_situation_id: "sit-cdi", risk_factor_id: "risk-cdi", origin: "CATALOG_DERIVED" }],
      hedge_sizing_dataframe: [{ sizing_id: "size-rate", alternative_id: "alt-rate", economic_situation_id: "sit-cdi", sizing_status: "sized", coverage_target_pct: 100, hedge_quantity: 1, hedge_unit: "contrato de swap de taxa (5,000,000 BRL)", required_data: ["contrato"], blocking_reason: "Referência contratual", method_version: "hedge-sizing-canonical-v1" }], scenario_result_dataframe: [],
    }} />);
    expect(screen.getByText("Dívida CDI e cobertura contratual")).toBeTruthy();
    expect(screen.getAllByText(/R\$\s?5\.000\.000,00/)).toHaveLength(3);
    expect(screen.getByText("contrato de swap de taxa (5,000,000 BRL)")).toBeTruthy();
    expect(screen.getByText("NOCIONAL")).toBeTruthy();
    expect(screen.getByText(/não mede duration, sensibilidade, taxa, cupom, curva, MTM, DV01 ou resultado financeiro/i)).toBeTruthy();
  });
});

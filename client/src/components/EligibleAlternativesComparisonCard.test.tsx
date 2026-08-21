// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import EligibleAlternativesComparisonCard from "./EligibleAlternativesComparisonCard";

afterEach(() => cleanup());

describe("EligibleAlternativesComparisonCard", () => {
  it("expõe fonte B3, premissas, cobertura dimensionada, resultado vinculado e bloqueios da mesma alternativa", () => {
    render(<EligibleAlternativesComparisonCard
      lineage={[{ source_id: "B3_PUBLIC_FILES", source_file: "BVBG.086.01.xml", source_asof: "2026-08-17", source_hash_sha256: "a".repeat(64) }]}
      dataframes={{
        economic_situation_dataframe: [{ economic_situation_id: "sit-1", exposure_id: "exp-1", situation_kind: "USD_PAYABLE", description: "Importação", declared_quantity: 100_000, declared_currency: "USD", horizon_date: "2026-12-15", commodity_reference: null, indexer: null, origin: "USER_DECLARED", captured_at_utc: "2026-08-18T00:00:00.000Z" }],
        risk_factor_dataframe: [{ risk_factor_id: "risk-1", economic_situation_id: "sit-1", risk_factor: "USD_BRL", adverse_move: "alta", economic_impact: "custo", hedge_direction: "BUY", method_version: "economic-exposure-diagnosis-v1" }],
        hedge_alternative_dataframe: [{ alternative_id: "alt-1", exposure_id: "exp-1", alternative_kind: "B3_DOL_FUTURE", label: "Futuro DOL", risk_factor: "USD_BRL", hedge_direction: "BUY", eligibility_status: "eligible_with_market_data", required_data: ["série DOL", "vencimento"], blocking_reason: null, source_ids: ["B3_PUBLIC_FILES"], method_version: "hedge-alternatives-v1", economic_situation_id: "sit-1", risk_factor_id: "risk-1", origin: "CATALOG_DERIVED" }],
        hedge_sizing_dataframe: [{ sizing_id: "size-1", alternative_id: "alt-1", economic_situation_id: "sit-1", sizing_status: "sized", coverage_target_pct: 100, hedge_quantity: 1, hedge_unit: "contrato DOL", required_data: ["exposição USD", "especificação B3 DOL"], blocking_reason: "Dimensionamento nocional sem preço de ajuste, margem ou custo financeiro.", method_version: "hedge-sizing-canonical-v1" }],
        scenario_result_dataframe: [{ scenario_result_id: "result-1", scenario_id: "scenario-1", alternative_id: "alt-1", calculation_id: "calc-1", result_status: "SUCCESS", economic_result: 123.45, result_currency: "BRL", limitation: "Resultado auditável", generated_at_utc: "2026-08-18T00:00:00.000Z" }],
        b3_observation_link_dataframe: [{ observation_link_id: "obs-1", alternative_id: "alt-1", family: "DOL", symbol: "DOLU26", instrument_id: "ID-DOL", instrument_type: "FUTURE", maturity: "2026-09-01", option_type: null, exercise_price: null, observed_prices: { last_price: 5.4, trade_average_price: null, adjusted_quote: 5.39, adjusted_quote_tax: null }, price_source: { report_type: "BVBG.086.01", source_url: "https://www.b3.com.br/pesquisapregao/download", source_file: "BVBG.086.01.xml", source_asof: "2026-08-17", source_hash_sha256: "a".repeat(64), normalized_csv_storage_key: "b3/normalized/price.csv", normalized_csv_sha256: "c".repeat(64), normalized_manifest_storage_key: "b3/normalized/price.manifest.json" }, instrument_source: { source_url: "https://www.b3.com.br/pesquisapregao/download", source_file: "BVBG.028.02.xml", source_asof: "2026-08-17", source_hash_sha256: "b".repeat(64), normalized_csv_storage_key: "b3/normalized/instrument.csv", normalized_csv_sha256: "d".repeat(64), normalized_manifest_storage_key: "b3/normalized/instrument.manifest.json" }, association_status: "valid_same_asof", selected_at_utc: "2026-08-18T00:00:00.000Z", method_version: "b3-observation-selection-v1" }],
      }}
    />);
    expect(screen.getByText("Futuro DOL")).toBeTruthy();
    expect(screen.getByText(/DOL · DOLU26/)).toBeTruthy();
    expect(screen.getByText(/venc. 2026-09-01/)).toBeTruthy();
    expect(screen.getByText("Evidência atual")).toBeTruthy();
    expect(screen.getByText(/100%/)).toBeTruthy();
    expect(screen.getByText(/Cobertura e cenário/)).toBeTruthy();
    expect(screen.getByText("Resultado vinculado")).toBeTruthy();
    expect(screen.getByText(/resultado 123.45 BRL/)).toBeTruthy();
    expect(screen.getByText("Resultado auditável")).toBeTruthy();
    expect(screen.getByText(/sem preço de ajuste, margem ou custo financeiro/i)).toBeTruthy();
  });

  it("permite selecionar uma alternativa declarada para abrir sua evidência contextual", () => {
    const onSelectAlternative = vi.fn();
    render(<EligibleAlternativesComparisonCard
      onSelectAlternative={onSelectAlternative}
      dataframes={{
        economic_situation_dataframe: [{ economic_situation_id: "sit-2", exposure_id: "exp-2", situation_kind: "USD_PAYABLE", description: "Pagamento", declared_quantity: 10_000, declared_currency: "USD", horizon_date: "2026-10-21", commodity_reference: null, indexer: null, origin: "USER_DECLARED", captured_at_utc: "2026-08-20T00:00:00.000Z" }],
        risk_factor_dataframe: [{ risk_factor_id: "risk-2", economic_situation_id: "sit-2", risk_factor: "USD_BRL", adverse_move: "alta", economic_impact: "custo", hedge_direction: "BUY", method_version: "economic-exposure-diagnosis-v1" }],
        hedge_alternative_dataframe: [{ alternative_id: "alt-select", exposure_id: "exp-2", alternative_kind: "B3_DOL_FUTURE", label: "Futuro DOL para análise", risk_factor: "USD_BRL", hedge_direction: "BUY", eligibility_status: "eligible_with_market_data", required_data: ["série DOL"], blocking_reason: null, source_ids: ["B3_PUBLIC_FILES"], method_version: "hedge-alternatives-v1", economic_situation_id: "sit-2", risk_factor_id: "risk-2", origin: "CATALOG_DERIVED" }],
        hedge_sizing_dataframe: [], scenario_result_dataframe: [], b3_observation_link_dataframe: [],
      }}
    />);
    fireEvent.click(screen.getByRole("button", { name: "Analisar esta alternativa" }));
    expect(onSelectAlternative).toHaveBeenCalledWith("alt-select");
  });

  it("exibe o resultado NDF canônico quando a alternativa OTC já foi vinculada por cálculo auditável", () => {
    render(<EligibleAlternativesComparisonCard dataframes={{
      economic_situation_dataframe: [{ economic_situation_id: "sit-usd", exposure_id: "exp-usd", situation_kind: "USD_PAYABLE", description: "Importação", declared_quantity: 100_000, declared_currency: "USD", horizon_date: "2026-09-01", commodity_reference: null, indexer: null, origin: "USER_DECLARED", captured_at_utc: "2026-08-18T00:00:00.000Z" }],
      risk_factor_dataframe: [{ risk_factor_id: "risk-usd", economic_situation_id: "sit-usd", risk_factor: "USD_BRL", adverse_move: "alta", economic_impact: "custo", hedge_direction: "BUY", method_version: "economic-exposure-diagnosis-v1" }],
      hedge_alternative_dataframe: [{ alternative_id: "alt-ndf", exposure_id: "exp-usd", alternative_kind: "OTC_NDF_OR_TERM", label: "NDF contratual", risk_factor: "USD_BRL", hedge_direction: "BUY", eligibility_status: "eligible_with_market_data", required_data: ["contrato", "PTAX"], blocking_reason: null, source_ids: ["USER_CONTRACT", "BCB_PTAX"], method_version: "hedge-alternatives-v1", economic_situation_id: "sit-usd", risk_factor_id: "risk-usd", origin: "CATALOG_DERIVED" }],
      hedge_sizing_dataframe: [],
      scenario_result_dataframe: [{ scenario_result_id: "result-ndf", scenario_id: "scn-ndf", alternative_id: "alt-ndf", calculation_id: "calc-ndf", result_status: "SUCCESS", economic_result: 456.78, result_currency: "BRL", limitation: "Cenário de liquidação NDF vinculado a contrato OTC hasheado.", generated_at_utc: "2026-08-18T00:00:00.000Z" }],
    }} />);
    expect(screen.getByText("NDF contratual")).toBeTruthy();
    expect(screen.getByText(/resultado 456.78 BRL/)).toBeTruthy();
    expect(screen.getByText(/contrato OTC hasheado/i)).toBeTruthy();
  });
});

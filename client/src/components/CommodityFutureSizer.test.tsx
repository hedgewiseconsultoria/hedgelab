// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { emptyCanonicalHedgeDataframes } from "../../../server/domain/canonicalHedgeDataframes";

const mocks = vi.hoisted(() => ({ useQuery: vi.fn() }));
vi.mock("@/lib/trpc", () => ({ trpc: { hedge: { sizeCommodityFuture: { useQuery: mocks.useQuery } } } }));
import CommodityFutureSizer from "./CommodityFutureSizer";
afterEach(() => cleanup());

describe("CommodityFutureSizer", () => {
  it("exige unidade física antes de publicar a cobertura de milho", () => {
    mocks.useQuery.mockReturnValue({ data: { contracts: 2, unit: "SACA_60KG", hedgedQuantity: 900, residualQuantity: 100, coverageRatio: 0.9, limitation: "sem conversão" }, isError: false });
    const dataframes = emptyCanonicalHedgeDataframes();
    dataframes.economic_situation_dataframe.push({ economic_situation_id: "sit-ccm", exposure_id: "exp-ccm", situation_kind: "COMMODITY_PURCHASE", description: "Compra de milho", declared_quantity: 1_000, declared_currency: "BRL", horizon_date: "2026-12-15", commodity_reference: "CCM", indexer: null, origin: "USER_DECLARED", captured_at_utc: "2026-08-18T00:00:00.000Z" });
    dataframes.hedge_alternative_dataframe.push({ alternative_id: "alt-ccm", exposure_id: "exp-ccm", alternative_kind: "B3_COMMODITY_FUTURE", label: "Futuro de milho", risk_factor: "B3_COMMODITY_PRICE", hedge_direction: "BUY", eligibility_status: "eligible_with_market_data", required_data: ["série CCM"], blocking_reason: null, source_ids: ["B3_PUBLIC_FILES"], method_version: "hedge-alternatives-v1", economic_situation_id: "sit-ccm", risk_factor_id: "risk-ccm", origin: "CATALOG_DERIVED" });
    const onSizing = vi.fn();
    render(<CommodityFutureSizer dataframes={dataframes} instrumentMasterRows={[{ instrument_id: "B3_PRODUCT_SPEC::CCM", instrument_key: "CCM", product_kind: "B3_COMMODITY_FUTURE", description: "Milho", terms: {}, source: "B3_PRODUCT_SPECIFICATION", evidence_source_file: "ccm.html", evidence_source_url: "https://www.b3.com.br/ccm", evidence_sha256: "a".repeat(64), evidence_captured_at_utc: "2026-08-18T00:00:00.000Z", validation_status: "official_specification_loaded", series_status: "no_b3_series_selected" }]} onSizing={onSizing} />);
    fireEvent.change(screen.getByLabelText("Exposição de commodity diagnosticada"), { target: { value: "sit-ccm" } });
    expect(screen.queryByRole("button", { name: "Registrar cobertura física" })).toBeNull();
    fireEvent.change(screen.getByLabelText("Unidade física declarada"), { target: { value: "SACA_60KG" } });
    fireEvent.click(screen.getByRole("button", { name: "Registrar cobertura física" }));
    expect(onSizing).toHaveBeenCalledWith(expect.objectContaining({ alternativeId: "alt-ccm", contract: "CCM", exposureUnit: "SACA_60KG", contracts: 2 }));
  });

  it("informa a validação em andamento sem publicar resultado enquanto a consulta está carregando", () => {
    mocks.useQuery.mockReturnValue({ data: undefined, isFetching: true, isError: false });
    const dataframes = emptyCanonicalHedgeDataframes();
    dataframes.economic_situation_dataframe.push({ economic_situation_id: "sit-ccm", exposure_id: "exp-ccm", situation_kind: "COMMODITY_PURCHASE", description: "Compra de milho", declared_quantity: 1_000, declared_currency: "BRL", horizon_date: "2026-12-15", commodity_reference: "CCM", indexer: null, origin: "USER_DECLARED", captured_at_utc: "2026-08-18T00:00:00.000Z" });
    dataframes.hedge_alternative_dataframe.push({ alternative_id: "alt-ccm", exposure_id: "exp-ccm", alternative_kind: "B3_COMMODITY_FUTURE", label: "Futuro de milho", risk_factor: "B3_COMMODITY_PRICE", hedge_direction: "BUY", eligibility_status: "eligible_with_market_data", required_data: ["série CCM"], blocking_reason: null, source_ids: ["B3_PUBLIC_FILES"], method_version: "hedge-alternatives-v1", economic_situation_id: "sit-ccm", risk_factor_id: "risk-ccm", origin: "CATALOG_DERIVED" });
    const master = [{ instrument_id: "B3_PRODUCT_SPEC::CCM", instrument_key: "CCM", product_kind: "B3_COMMODITY_FUTURE", description: "Milho", terms: {}, source: "B3_PRODUCT_SPECIFICATION", evidence_source_file: "ccm.html", evidence_source_url: "https://www.b3.com.br/ccm", evidence_sha256: "a".repeat(64), evidence_captured_at_utc: "2026-08-18T00:00:00.000Z", validation_status: "official_specification_loaded", series_status: "no_b3_series_selected" } as const];
    render(<CommodityFutureSizer dataframes={dataframes} instrumentMasterRows={master} />);
    fireEvent.change(screen.getByLabelText("Exposição de commodity diagnosticada"), { target: { value: "sit-ccm" } });
    fireEvent.change(screen.getByLabelText("Unidade física declarada"), { target: { value: "SACA_60KG" } });
    expect(screen.getByText("Validando a equivalência física pela especificação B3…")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Registrar cobertura física" })).toBeNull();
  });
});

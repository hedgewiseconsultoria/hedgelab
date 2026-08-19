// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { emptyCanonicalHedgeDataframes } from "../../../server/domain/canonicalHedgeDataframes";

const mocks = vi.hoisted(() => ({ useQuery: vi.fn() }));
vi.mock("@/lib/trpc", () => ({ trpc: { hedge: { sizeCommodityOption: { useQuery: mocks.useQuery } } } }));
import CommodityOptionSizer from "./CommodityOptionSizer";

afterEach(() => cleanup());

function frames(withObservation: boolean) {
  const dataframes = emptyCanonicalHedgeDataframes();
  dataframes.economic_situation_dataframe.push({ economic_situation_id: "sit-ccm", exposure_id: "exp-ccm", situation_kind: "COMMODITY_PURCHASE", description: "Compra de milho", declared_quantity: 1_000, declared_currency: "BRL", horizon_date: "2026-12-15", commodity_reference: "CCM", indexer: null, origin: "USER_DECLARED", captured_at_utc: "2026-08-18T00:00:00.000Z" });
  dataframes.hedge_alternative_dataframe.push({ alternative_id: "alt-ccm-option", exposure_id: "exp-ccm", alternative_kind: "B3_COMMODITY_OPTION", label: "Opção de milho", risk_factor: "B3_COMMODITY_PRICE", hedge_direction: "BUY", eligibility_status: "eligible_with_market_data", required_data: ["série CCM"], blocking_reason: null, source_ids: ["B3_PUBLIC_FILES", "B3_PRODUCT_SPECIFICATION"], method_version: "hedge-alternatives-v1", economic_situation_id: "sit-ccm", risk_factor_id: "risk-ccm", origin: "CATALOG_DERIVED" });
  if (withObservation) (dataframes.b3_observation_link_dataframe ??= []).push({ alternative_id: "alt-ccm-option", family: "CCM", symbol: "CCMX26C", instrument_type: "OPTION" } as any);
  return dataframes;
}

const master = [{ instrument_id: "B3_PRODUCT_SPEC::CCM_OPTION", instrument_key: "CCM_OPTION", product_kind: "B3_COMMODITY_OPTION", description: "Opção de milho", terms: {}, source: "B3_PRODUCT_SPECIFICATION", evidence_source_file: "ccm-option.html", evidence_source_url: "https://www.b3.com.br/ccm-option", evidence_sha256: "a".repeat(64), evidence_captured_at_utc: "2026-08-18T00:00:00.000Z", validation_status: "official_specification_loaded", series_status: "no_b3_series_selected" } as const];

describe("CommodityOptionSizer", () => {
  it("bloqueia publicação até haver série B3 de opção, unidade, posição e tipo declarados", () => {
    mocks.useQuery.mockReturnValue({ data: { contracts: 2, unit: "SACA_60KG", referencedUnderlyingQuantity: 900, residualQuantity: 100, coverageRatio: 0.9, limitation: "sem delta" }, isError: false, isFetching: false });
    const onSizing = vi.fn();
    render(<CommodityOptionSizer dataframes={frames(false)} instrumentMasterRows={master} onSizing={onSizing} />);
    fireEvent.change(screen.getByLabelText("Exposição de commodity diagnosticada"), { target: { value: "sit-ccm" } });
    fireEvent.change(screen.getByLabelText("Unidade física declarada"), { target: { value: "SACA_60KG" } });
    fireEvent.change(screen.getByLabelText("Posição declarada"), { target: { value: "LONG" } });
    fireEvent.change(screen.getByLabelText("Tipo da opção"), { target: { value: "CALL" } });
    expect((screen.getByRole("button", { name: "Registrar referência física" }) as HTMLButtonElement).disabled).toBe(true);
    expect(onSizing).not.toHaveBeenCalled();
  });

  it("publica a referência máxima somente após vincular observação B3 de opção", () => {
    mocks.useQuery.mockReturnValue({ data: { contracts: 2, unit: "SACA_60KG", referencedUnderlyingQuantity: 900, residualQuantity: 100, coverageRatio: 0.9, limitation: "sem delta" }, isError: false, isFetching: false });
    const onSizing = vi.fn();
    render(<CommodityOptionSizer dataframes={frames(true)} instrumentMasterRows={master} onSizing={onSizing} />);
    fireEvent.change(screen.getByLabelText("Exposição de commodity diagnosticada"), { target: { value: "sit-ccm" } });
    fireEvent.change(screen.getByLabelText("Unidade física declarada"), { target: { value: "SACA_60KG" } });
    fireEvent.change(screen.getByLabelText("Posição declarada"), { target: { value: "LONG" } });
    fireEvent.change(screen.getByLabelText("Tipo da opção"), { target: { value: "CALL" } });
    fireEvent.click(screen.getByRole("button", { name: "Registrar referência física" }));
    expect(onSizing).toHaveBeenCalledWith(expect.objectContaining({ alternativeId: "alt-ccm-option", contract: "CCM", optionPosition: "LONG", optionType: "CALL", contracts: 2 }));
  });
});

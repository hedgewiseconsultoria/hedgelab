// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { emptyCanonicalHedgeDataframes } from "../../../server/domain/canonicalHedgeDataframes";

const mocks = vi.hoisted(() => ({ useQuery: vi.fn() }));
vi.mock("@/lib/trpc", () => ({ trpc: { hedge: { sizeDollarOption: { useQuery: mocks.useQuery } } } }));
import FxOptionSizer from "./FxOptionSizer";

afterEach(() => cleanup());

function frames(withObservation: boolean) {
  const dataframes = emptyCanonicalHedgeDataframes();
  dataframes.economic_situation_dataframe.push({ economic_situation_id: "sit-usd", exposure_id: "exp-usd", situation_kind: "USD_PAYABLE", description: "Importação", declared_quantity: 120_000, declared_currency: "USD", horizon_date: "2026-12-01", commodity_reference: null, indexer: null, origin: "USER_DECLARED", captured_at_utc: "2026-08-18T00:00:00.000Z" });
  dataframes.hedge_alternative_dataframe.push({ alternative_id: "alt-dol-option", exposure_id: "exp-usd", alternative_kind: "B3_DOL_OPTION", label: "Opção DOL", risk_factor: "USD_BRL", hedge_direction: "BUY", eligibility_status: "eligible_with_market_data", required_data: ["série"], blocking_reason: null, source_ids: ["B3_PUBLIC_FILES", "B3_PRODUCT_SPECIFICATION"], method_version: "hedge-alternatives-v1", economic_situation_id: "sit-usd", risk_factor_id: "risk-usd", origin: "CATALOG_DERIVED" });
  if (withObservation) (dataframes.b3_observation_link_dataframe ??= []).push({ alternative_id: "alt-dol-option", family: "DOL", symbol: "DOLX26C", instrument_type: "OPTION" } as any);
  return dataframes;
}

const master = [{ instrument_id: "B3_PRODUCT_SPEC::DOL_OPTION", instrument_key: "DOL_OPTION", product_kind: "B3_FX_OPTION", description: "Opção DOL", terms: {}, source: "B3_PRODUCT_SPECIFICATION", evidence_source_file: "dol-option.html", evidence_source_url: "https://www.b3.com.br/dol-option", evidence_sha256: "a".repeat(64), evidence_captured_at_utc: "2026-08-18T00:00:00.000Z", validation_status: "official_specification_loaded", series_status: "no_b3_series_selected" } as const];

describe("FxOptionSizer", () => {
  it("bloqueia a publicação sem série B3 de opção", () => {
    mocks.useQuery.mockReturnValue({ data: { contracts: 2, referencedUsd: 100_000, residualUsd: 20_000, coverageRatio: 100_000 / 120_000, limitation: "sem delta" }, isError: false, isFetching: false });
    render(<FxOptionSizer dataframes={frames(false)} instrumentMasterRows={master} onSizing={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Exposição USD diagnosticada"), { target: { value: "exp-usd" } });
    fireEvent.change(screen.getByLabelText("Posição declarada"), { target: { value: "LONG" } });
    fireEvent.change(screen.getByLabelText("Tipo da opção"), { target: { value: "CALL" } });
    expect((screen.getByRole("button", { name: "Registrar referência nocional" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("publica somente após ficha e observação B3 da opção DOL", () => {
    mocks.useQuery.mockReturnValue({ data: { contracts: 2, referencedUsd: 100_000, residualUsd: 20_000, coverageRatio: 100_000 / 120_000, limitation: "sem delta" }, isError: false, isFetching: false });
    const onSizing = vi.fn();
    render(<FxOptionSizer dataframes={frames(true)} instrumentMasterRows={master} onSizing={onSizing} />);
    fireEvent.change(screen.getByLabelText("Exposição USD diagnosticada"), { target: { value: "exp-usd" } });
    fireEvent.change(screen.getByLabelText("Posição declarada"), { target: { value: "LONG" } });
    fireEvent.change(screen.getByLabelText("Tipo da opção"), { target: { value: "CALL" } });
    fireEvent.click(screen.getByRole("button", { name: "Registrar referência nocional" }));
    expect(onSizing).toHaveBeenCalledWith(expect.objectContaining({ exposureId: "exp-usd", optionPosition: "LONG", optionType: "CALL", contracts: 2 }));
  });
});

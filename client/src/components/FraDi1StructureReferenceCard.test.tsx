// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { emptyCanonicalHedgeDataframes } from "../../../server/domain/canonicalHedgeDataframes";
import FraDi1StructureReferenceCard from "./FraDi1StructureReferenceCard";

afterEach(() => cleanup());
function frames(twoLegs: boolean) {
  const dataframes = emptyCanonicalHedgeDataframes();
  dataframes.hedge_alternative_dataframe.push({ alternative_id: "alt-fra", exposure_id: "exp", alternative_kind: "B3_FRA_DI1", label: "FRA", risk_factor: "CDI_RATE", hedge_direction: "SELL", eligibility_status: "blocked", required_data: [], blocking_reason: "pendente", source_ids: ["B3_PUBLIC_FILES", "B3_PRODUCT_SPECIFICATION"], method_version: "hedge-alternatives-v1", economic_situation_id: "sit", risk_factor_id: "risk", origin: "CATALOG_DERIVED" });
  const source = { source_asof: "2026-08-17", source_hash_sha256: "a".repeat(64) };
  (dataframes.b3_observation_link_dataframe ??= []).push({ alternative_id: "alt-fra", family: "DI1", symbol: "DI1F27", instrument_id: "DI1-2027", instrument_type: "FUTURE", maturity: "2027-01-01", price_source: source, instrument_source: source } as any);
  if (twoLegs) dataframes.b3_observation_link_dataframe.push({ alternative_id: "alt-fra", family: "DI1", symbol: "DI1F28", instrument_id: "DI1-2028", instrument_type: "FUTURE", maturity: "2028-01-01", price_source: source, instrument_source: source } as any);
  return dataframes;
}
describe("FraDi1StructureReferenceCard", () => {
  it("bloqueia a referência sem dois vencimentos DI1 distintos", () => {
    render(<FraDi1StructureReferenceCard dataframes={frames(false)} />);
    expect(screen.getByText(/Vincule dois futuros DI1 distintos/i)).toBeTruthy();
  });
  it("registra os dois vencimentos sem calcular PU ou DV01", () => {
    const onSnapshot = vi.fn();
    render(<FraDi1StructureReferenceCard dataframes={frames(true)} onSnapshot={onSnapshot} />);
    fireEvent.click(screen.getByRole("button", { name: "Registrar referência no histórico" }));
    expect(onSnapshot).toHaveBeenCalledWith(expect.objectContaining({ calculations: [expect.objectContaining({ method: "B3_FRA_DI1_LEG_REFERENCE", result: expect.objectContaining({ near_di1_symbol: "DI1F27", far_di1_symbol: "DI1F28", opposing_natures_required: true }) })] }));
  });
});

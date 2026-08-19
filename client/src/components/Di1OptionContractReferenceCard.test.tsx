// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { emptyCanonicalHedgeDataframes } from "../../../server/domain/canonicalHedgeDataframes";
import Di1OptionContractReferenceCard from "./Di1OptionContractReferenceCard";

afterEach(() => cleanup());

function frames(withFuture = true) {
  const dataframes = emptyCanonicalHedgeDataframes();
  dataframes.hedge_alternative_dataframe.push({ alternative_id: "alt-di-option", exposure_id: "exp", alternative_kind: "B3_DI1_OPTION", label: "Opção DI", risk_factor: "CDI_RATE", hedge_direction: "SELL", eligibility_status: "blocked", required_data: [], blocking_reason: "pendente", source_ids: ["B3_PUBLIC_FILES", "B3_PRODUCT_SPECIFICATION"], method_version: "hedge-alternatives-v1", economic_situation_id: "sit", risk_factor_id: "risk", origin: "CATALOG_DERIVED" });
  const source = { source_asof: "2026-08-17", source_hash_sha256: "a".repeat(64) };
  (dataframes.b3_observation_link_dataframe ??= []).push({ alternative_id: "alt-di-option", family: "DI1", symbol: "D11X26", instrument_id: "OPT-D11", instrument_type: "OPTION", maturity: "2026-10-01", price_source: source, instrument_source: source } as any);
  if (withFuture) dataframes.b3_observation_link_dataframe.push({ alternative_id: "alt-di-option", family: "DI1", symbol: "DI1F27", instrument_id: "FUT-DI1", instrument_type: "FUTURE", maturity: "2027-01-01", price_source: source, instrument_source: source } as any);
  return dataframes;
}
const master = [{ instrument_id: "B3_PRODUCT_SPEC::DI1_OPTION", instrument_key: "DI1_OPTION", product_kind: "B3_DI_OPTION", description: "Opção DI", terms: {}, source: "B3_PRODUCT_SPECIFICATION", evidence_source_file: "di-option.html", evidence_source_url: "https://www.b3.com.br", evidence_sha256: "a".repeat(64), evidence_captured_at_utc: "2026-08-18T00:00:00.000Z", validation_status: "official_specification_loaded", series_status: "no_b3_series_selected" } as const];

describe("Di1OptionContractReferenceCard", () => {
  it("bloqueia a referência enquanto o futuro-objeto não foi selecionado", () => {
    render(<Di1OptionContractReferenceCard dataframes={frames(false)} instrumentMasterRows={master} />);
    expect(screen.getByText(/Selecione uma observação DI1 do tipo FUTURE/i)).toBeTruthy();
  });
  it("registra somente a referência contratual com as duas evidências B3", () => {
    const onSnapshot = vi.fn();
    render(<Di1OptionContractReferenceCard dataframes={frames(true)} instrumentMasterRows={master} onSnapshot={onSnapshot} />);
    fireEvent.click(screen.getByRole("button", { name: "Registrar referência no histórico" }));
    expect(onSnapshot).toHaveBeenCalledWith(expect.objectContaining({ calculations: [expect.objectContaining({ method: "B3_DI1_OPTION_CONTRACT_REFERENCE", result: expect.objectContaining({ option_to_underlying_contract_ratio: 1, option_symbol: "D11X26", underlying_di1_symbol: "DI1F27" }) })] }));
  });
});

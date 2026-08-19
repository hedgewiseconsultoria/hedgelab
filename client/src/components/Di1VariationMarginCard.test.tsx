// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const refetch = vi.fn();
vi.mock("@/lib/trpc", () => ({ trpc: { hedge: { di1VariationMargin: { useQuery: vi.fn((input: { positionState: string }) => ({ data: input.positionState === "OUTSTANDING_FROM_PREVIOUS_DAY" ? { method: "B3_DI1_DAILY_VARIATION_MARGIN", formulaVersion: "B3_DI1_CONTRACT_2026_08", tradePu: null, correctionFactor: 1.0005, dailyVariationMarginBrl: -120, calculation: "ADt = sinal × [PAt − (PAt−1 × FCt)]", cashSettlement: "next_trading_session" } : { method: "B3_DI1_DAILY_VARIATION_MARGIN", formulaVersion: "B3_DI1_CONTRACT_2026_08", tradePu: 87_719.298, dailyVariationMarginBrl: 11_280.702, calculation: "ADt = sinal × (PAt − PO)", cashSettlement: "next_trading_session" }, isFetching: false, isError: false, refetch })) } } } }));
import Di1VariationMarginCard from "./Di1VariationMarginCard";

afterEach(() => cleanup());

describe("Di1VariationMarginCard", () => {
  it("exige evidência B3 e expõe PO e ajuste diário sem usar cenário linear", async () => {
    const onSnapshot = vi.fn();
    render(<Di1VariationMarginCard onSnapshot={onSnapshot} curveReference={{ status: "valid_market_vertices", asof: "2026-08-13", calendarId: "B3_TRADING_2026", issues: [], limitations: [], dataframe: [{ curve_point_id: "DI1-1", asof: "2026-08-13", instrument_id: "1", symbol: "DI1U26", maturity: "2026-09-01", adjusted_rate_pct_aa252: 14.1, business_days_to_maturity: 13, business_days_status: "validated", quotation_convention: "EFFECTIVE_ANNUAL_RATE_AA_252_PUBLISHED_BY_B3", source_file: "BVBG.086.01.xml", source_hash_sha256: "a".repeat(64) }] }} />);
    const fields: Array<[string, string]> = [["di1-settlement-pu", "99000"], ["di1-rate", "14"], ["di1-business-days", "252"], ["di1-asof", "2026-08-13"], ["di1-file", "PR260813.xml"], ["di1-hash", "a".repeat(64)]];
    fields.forEach(([id, value]) => fireEvent.change(document.getElementById(id)!, { target: { value } }));
    fireEvent.click(screen.getByRole("button", { name: "Calcular ajuste DI1" }));
    await waitFor(() => expect(refetch).toHaveBeenCalled());
    await waitFor(() => expect(onSnapshot).toHaveBeenCalled());
    expect(onSnapshot.mock.calls[0]?.[0]).toMatchObject({ calculations: [{ method: "B3_DI1_DAILY_VARIATION_MARGIN", calculation_status: "SUCCESS" }] });
    expect(onSnapshot.mock.calls[0]?.[0]).toMatchObject({ calculations: [{ result: { parameters: { curve_reference: { asof: "2026-08-13", calendar_id: "B3_TRADING_2026", usage: "RECONCILIATION_ONLY_NO_PU_MTM_DV01_FRA_INTERPOLATION" } } } }] });
    expect(screen.getByText("PU de origem (PO)")).toBeTruthy();
    expect(screen.getByText(/ADt = sinal/)).toBeTruthy();
    expect(screen.getByText(/não calcula MTM, DV01 ou FRA/i)).toBeTruthy();
  });

  it("permite posição em aberto somente com PU anterior, taxas DI e três evidências B3", async () => {
    refetch.mockClear();
    render(<Di1VariationMarginCard />);
    fireEvent.change(document.getElementById("di1-state")!, { target: { value: "OUTSTANDING_FROM_PREVIOUS_DAY" } });
    const fields: Array<[string, string]> = [["di1-settlement-pu", "99100"], ["di1-previous-pu", "99000"], ["di1-correction-rates", "14,25;14,30"], ["di1-asof", "2026-08-13"], ["di1-file", "PR260813.xml"], ["di1-hash", "a".repeat(64)], ["di1-prev-asof", "2026-08-12"], ["di1-prev-file", "PR260812.xml"], ["di1-prev-hash", "b".repeat(64)], ["di1-di-asof", "2026-08-13"], ["di1-di-file", "DI260813.xml"], ["di1-di-hash", "c".repeat(64)]];
    fields.forEach(([id, value]) => fireEvent.change(document.getElementById(id)!, { target: { value } }));
    fireEvent.click(screen.getByRole("button", { name: "Calcular ajuste DI1" }));
    await waitFor(() => expect(refetch).toHaveBeenCalled());
    expect(screen.getByText("Fator de correção")).toBeTruthy();
  });
});

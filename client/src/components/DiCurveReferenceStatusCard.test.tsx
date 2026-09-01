// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DiCurveReferenceStatusCard from "./DiCurveReferenceStatusCard";

describe("DiCurveReferenceStatusCard", () => {
  it("expõe a referência B3 e preserva bloqueios quantitativos", () => {
    render(<DiCurveReferenceStatusCard curve={{ status: "valid_market_vertices", asof: "2026-08-13", calendarId: "B3_TRADING_2026", issues: [], limitations: [], dataframe: [{ curve_point_id: "DI1-1", asof: "2026-08-13", instrument_id: "1", symbol: "DI1U26", maturity: "2026-09-01", adjusted_rate_pct_aa252: 14.1, business_days_to_maturity: 13, business_days_status: "validated", quotation_convention: "EFFECTIVE_ANNUAL_RATE_AA_252_PUBLISHED_BY_B3", source_file: "BVBG.086.01.xml", source_hash_sha256: "a".repeat(64) }] }} />);
    expect(screen.getByText(/Vértices DI1 disponíveis/i)).toBeTruthy();
    expect(screen.getByText(/MTM, DV01, FRA ou curva interpolada/i)).toBeTruthy();
    expect(screen.getByText(/DI1U26/)).toBeTruthy();
  });
});

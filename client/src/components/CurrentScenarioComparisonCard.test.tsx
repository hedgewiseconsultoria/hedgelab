// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CurrentScenarioComparisonCard from "./CurrentScenarioComparisonCard";

describe("CurrentScenarioComparisonCard", () => {
  it("exibe método, status, resultado e limitações sem criar ranking entre cálculos", () => {
    render(<CurrentScenarioComparisonCard scenarios={[{ scenario_id: "cen-1", scenario_name: "Dólar adverso", fx_shock_pct: 5, rate_shock_bps: null, volatility_shock_pct: null, created_at_utc: "2026-08-18T00:00:00.000Z" }]} calculations={[{ calculation_id: "calc-1", scenario_id: "cen-1", method: "LINEAR_FUTURES_SCENARIO", formula_version: "v1", calculation_status: "WARNING", result: { residualResult: -10_000, parameters: { hedgeContracts: 2, initialPrice: 5.1 }, lineage: { sourceId: "USER_PARAMETERIZED_SCENARIO", sourceFile: "cenario-aula", sourceAsOf: "2026-08-18", sourceHashSha256: null } }, warnings: ["Cenário parametrizado"], calculated_at_utc: "2026-08-18T00:00:00.000Z" }]} lineage={[{ source_id: "BCB_PTAX", source_url: "https://olinda.bcb.gov.br", source_file: "ptax.json", extracted_at_utc: "2026-08-18T00:00:00.000Z", source_asof: "2026-08-18", source_hash_sha256: "a".repeat(64), parser_version: "v1", validation_status: "valid" }]} />);
    expect(screen.getByText("Dólar adverso")).toBeTruthy();
    expect(screen.getByText("LINEAR_FUTURES_SCENARIO")).toBeTruthy();
    expect(screen.getByText("WARNING")).toBeTruthy();
    expect(screen.getByText(/Cenário parametrizado/)).toBeTruthy();
    expect(screen.getByText(/não compara ou classifica como equivalentes/i)).toBeTruthy();
    expect(screen.getByText("Ver parâmetros")).toBeTruthy();
    expect(document.body.textContent).toContain("cenario-aula");
    expect(screen.getByText("BCB_PTAX")).toBeTruthy();
  });
});

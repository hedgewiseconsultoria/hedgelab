// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ScenarioStrategyComparisonCard from "./ScenarioStrategyComparisonCard";

describe("ScenarioStrategyComparisonCard", () => {
  it("separa hedge parcial linear de exercício intrínseco de opção sem igualar as métricas", () => {
    render(<ScenarioStrategyComparisonCard scenarios={[{ scenario_id: "cen-linear", scenario_name: "Cenário de milho", fx_shock_pct: null, rate_shock_bps: null, volatility_shock_pct: null, created_at_utc: "2026-08-18T00:00:00.000Z" }, { scenario_id: "cen-opcao", scenario_name: "Opção SJC", fx_shock_pct: null, rate_shock_bps: null, volatility_shock_pct: null, created_at_utc: "2026-08-18T00:00:00.000Z" }]} calculations={[{ calculation_id: "linear-1", scenario_id: "cen-linear", method: "LINEAR_FUTURES_SCENARIO", formula_version: "v1", calculation_status: "WARNING", result: { instrumentLabel: "CCM", quotationUnit: "BRL por saca", unhedgedEconomicResult: -10_000, futuresResult: 5_000, residualResult: -5_000, hedgeCoverageRatio: 0.5, parameters: { instrumentLabel: "CCM", quotationUnit: "BRL por saca" } }, warnings: [], calculated_at_utc: "2026-08-18T00:00:00.000Z" }, { calculation_id: "sjc-1", scenario_id: "cen-opcao", method: "B3_SJC_OPTION_INTRINSIC_SETTLEMENT_SCENARIO", formula_version: "v1", calculation_status: "SUCCESS", result: { grossExerciseUsd: 9_000 }, warnings: [], calculated_at_utc: "2026-08-18T00:00:00.000Z" }]} />);
    expect(screen.getByText("PARCIAL")).toBeTruthy();
    expect(screen.getByText("NÃO EQUIVALENTE")).toBeTruthy();
    expect(screen.getByText(/USD 9\.000,00/)).toBeTruthy();
    expect(screen.getByText(/Não comparar com futuro ou sem hedge/)).toBeTruthy();
  });
});

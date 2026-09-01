// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

(globalThis as any).ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
const refetch = vi.fn();
vi.mock("@/lib/trpc", () => ({ trpc: { hedge: { linearFuturesScenario: { useQuery: vi.fn(() => ({ data: { unhedgedEconomicResult: -20_000, futuresResult: 20_000, residualResult: 0, hedgeCoverageRatio: 1, lineage: { sourceId: "USER_PARAMETERIZED_SCENARIO", sourceFile: "cenario-parametrizado-na-interface", sourceHashSha256: null, sourceAsOf: "2026-08-18" }, limitations: ["Resultado bruto linear", "Cenário didático"] }, isFetching: false, isError: false, refetch })) } } } }));
import LinearFuturesScenarioCard from "./LinearFuturesScenarioCard";

describe("LinearFuturesScenarioCard", () => {
  it("calcula somente o cenário parametrizado e exibe limitações de mercado", async () => {
    const onSnapshot = vi.fn();
    render(<LinearFuturesScenarioCard onSnapshot={onSnapshot} />);
    fireEvent.click(screen.getByRole("button", { name: "Calcular cenário" }));
    await waitFor(() => expect(refetch).toHaveBeenCalled());
    await waitFor(() => expect(onSnapshot).toHaveBeenCalled());
    expect(onSnapshot.mock.calls[0]?.[0]).toMatchObject({ calculations: [{ method: "LINEAR_FUTURES_SCENARIO", calculation_status: "WARNING", result: { parameters: { instrumentLabel: "DOL", dataMode: "USER_PARAMETERIZED_SCENARIO", targetCoveragePct: 100, horizonDate: expect.any(String) }, lineage: { sourceFile: "cenario-parametrizado-na-interface", sourceAsOf: "2026-08-18" } } }] });
    expect(screen.getByText("Exposição sem hedge")).toBeTruthy();
    expect(screen.getByText(/Resultado bruto linear Cenário didático/)).toBeTruthy();
    expect(screen.getByText(/não consulta, infere ou substitui preços e ajustes B3/i)).toBeTruthy();
    expect(screen.getByLabelText("Meta de cobertura (%)")).toBeTruthy();
    expect(screen.getByLabelText("Horizonte do fluxo")).toBeTruthy();
  });
});

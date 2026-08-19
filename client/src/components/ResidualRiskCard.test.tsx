// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  residualRisk: vi.fn(() => ({ data: { residualExposureBrl: 80_000, coveragePct: 0.2, residualVarBrl: 7_500, calculationMemory: ["memória", "de", "cálculo"] }, isLoading: false })),
}));

vi.mock("@/lib/trpc", () => ({ trpc: { risk: { residualRisk: { useQuery: mocks.residualRisk } } } }));

import ResidualRiskCard from "./ResidualRiskCard";

describe("ResidualRiskCard", () => {
  it("publica uma memória de risco residual quando as entradas e a linhagem são válidas", async () => {
    const onSessionSnapshot = vi.fn();
    render(<ResidualRiskCard valuationAsOf="2026-08-13" sourceIds={["BCB_PTAX"]} onSessionSnapshot={onSessionSnapshot} />);

    fireEvent.change(screen.getByLabelText("Exposição bruta (BRL)"), { target: { value: "100000" } });
    fireEvent.change(screen.getByLabelText("Equivalente do hedge (BRL)"), { target: { value: "-20000" } });

    await waitFor(() => {
      expect(onSessionSnapshot).toHaveBeenLastCalledWith(expect.objectContaining({
        scenario: expect.objectContaining({ scenario_id: expect.stringContaining("residual-risk") }),
        calculations: [expect.objectContaining({ method: "RESIDUAL_PARAMETRIC_VAR", result: expect.objectContaining({ residual_var_brl: 7_500 }) })],
      }));
    });
  });
});

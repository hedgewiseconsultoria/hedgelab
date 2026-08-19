// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fxStressQuery: vi.fn(() => ({ data: { pnlBrl: 25_000, stressedRate: 5.75, signedDeltaBrlPerOnePercent: 5_000 }, isError: false })),
  varQuery: vi.fn(() => ({ data: { varBrl: 12_000 }, isError: false })),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    risk: {
      fxStress: { useQuery: mocks.fxStressQuery },
      parametricVar: { useQuery: mocks.varQuery },
    },
  },
}));

import FxScenarioLab from "./FxScenarioLab";

describe("FxScenarioLab", () => {
  it("publica cenário e memórias de cálculo reais para o estado de sessão quando a consulta retorna resultados", async () => {
    const onSessionSnapshot = vi.fn();
    render(<FxScenarioLab exposures={[{ exposure_id: "EXP-USD", description: "Importação", currency: "USD", direction: "PAYABLE", notional: 100_000 }]} ptaxSale={5.25} onSessionSnapshot={onSessionSnapshot} />);

    fireEvent.change(screen.getAllByRole("combobox")[0]!, { target: { value: "EXP-USD" } });

    await waitFor(() => {
      expect(onSessionSnapshot).toHaveBeenLastCalledWith(expect.objectContaining({
        scenario: expect.objectContaining({ scenario_id: expect.stringContaining("EXP-USD"), fx_shock_pct: 10, volatility_shock_pct: 1 }),
        calculations: expect.arrayContaining([
          expect.objectContaining({ method: "FX_STRESS_PTAX", result: expect.objectContaining({ pnl_brl: 25_000 }) }),
          expect.objectContaining({ method: "PARAMETRIC_VAR_NORMAL", result: expect.objectContaining({ var_brl: 12_000 }) }),
        ]),
      }));
    });
  });
});

/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, vi, describe, expect, it } from "vitest";

const mocks = vi.hoisted(() => ({ useQuery: vi.fn((input: unknown) => ({
  isLoading: false,
  data: input ? {
    offsetRatio: 0.95,
    ineffectivenessBrl: 5_000,
    actualNotionalHedgeRatio: 0.9,
    method: "IFRS9_CPC48_SCREENING",
    status: "screening_passed_not_accounting_conclusion",
    warnings: ["Diagnóstico sem lançamento contábil."],
    accountingFramework: "IFRS9_CPC48",
    accountingPolicyReference: "POL-HDG-001",
    lineage: { valuationAsOf: "2026-08-13" },
  } : undefined,
})) }));

vi.mock("@/lib/trpc", () => ({ trpc: { hedge: { hedgeEffectiveness: { useQuery: mocks.useQuery } } } }));

import HedgeEffectivenessCard from "./HedgeEffectivenessCard";

afterEach(() => { cleanup(); mocks.useQuery.mockClear(); });

describe("HedgeEffectivenessCard", () => {
  it("envia nocionais e exibe o hedge ratio retornado", async () => {
    const user = userEvent.setup();
    const onSessionSnapshot = vi.fn();
    render(<HedgeEffectivenessCard valuationAsOf="2026-08-13" sourceIds={["BCB_PTAX"]} onSessionSnapshot={onSessionSnapshot} />);
    await user.type(screen.getByLabelText("Variação do item protegido (BRL)"), "100000");
    await user.type(screen.getByLabelText("Variação do instrumento (BRL)"), "-95000");
    await user.type(screen.getByLabelText("Nocional do item protegido (BRL)"), "1000000");
    await user.type(screen.getByLabelText("Nocional do instrumento (BRL)"), "900000");
    await user.type(screen.getByLabelText("Referência de política"), "POL-HDG-001");
    for (const checkbox of screen.getAllByRole("checkbox")) await user.click(checkbox);
    expect(mocks.useQuery).toHaveBeenLastCalledWith(expect.objectContaining({ hedgedItemNotionalBrl: 1_000_000, hedgingInstrumentNotionalBrl: 900_000, accountingFramework: "IFRS9_CPC48", accountingPolicyReference: "POL-HDG-001" }), expect.any(Object));
    expect(await screen.findByText("0.9000")).toBeInTheDocument();
    await waitFor(() => expect(onSessionSnapshot).toHaveBeenLastCalledWith(expect.objectContaining({ calculations: [expect.objectContaining({ method: "IFRS9_CPC48_SCREENING", result: expect.objectContaining({ actual_notional_hedge_ratio: 0.9 }) })] })));
  });

  it("envia o framework IAS 39 legado para o ramo de política distinto", async () => {
    const user = userEvent.setup();
    render(<HedgeEffectivenessCard valuationAsOf="2026-08-13" sourceIds={["BCB_PTAX"]} />);
    await user.type(screen.getByLabelText("Variação do item protegido (BRL)"), "100");
    await user.type(screen.getByLabelText("Variação do instrumento (BRL)"), "-100");
    await user.type(screen.getByLabelText("Nocional do item protegido (BRL)"), "100");
    await user.type(screen.getByLabelText("Nocional do instrumento (BRL)"), "100");
    await user.type(screen.getByLabelText("Referência de política"), "POL-LEG-001");
    await user.selectOptions(screen.getByLabelText("Framework declarado"), "IAS39_LEGACY");
    expect(mocks.useQuery).toHaveBeenLastCalledWith(expect.objectContaining({ accountingFramework: "IAS39_LEGACY", accountingPolicyReference: "POL-LEG-001" }), expect.any(Object));
  });
});

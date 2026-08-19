// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ useQuery: vi.fn(), refetch: vi.fn() }));
vi.mock("@/lib/trpc", () => ({ trpc: { hedge: { b3FxFutureDailySettlement: { useQuery: mocks.useQuery } } } }));

import B3FxFutureDailySettlementCard from "./B3FxFutureDailySettlementCard";

afterEach(() => cleanup());

describe("B3FxFutureDailySettlementCard", () => {
  it("exige dois preços e duas evidências B3 antes de disparar o ajuste", () => {
    mocks.useQuery.mockReturnValue({ data: undefined, isFetching: false, isError: false, refetch: mocks.refetch });
    render(<B3FxFutureDailySettlementCard />);
    const button = screen.getByRole("button", { name: "Calcular ajuste" });
    expect(button).toHaveProperty("disabled", true);
    const values: Record<string, string> = {
      "fx-settlement-contracts": "2", "fx-settlement-previous-quote": "5200", "fx-settlement-current-quote": "5210", "fx-settlement-previous-asof": "2026-08-12", "fx-settlement-current-asof": "2026-08-13", "fx-settlement-previous-file": "BVBG.086.01-12.xml", "fx-settlement-current-file": "BVBG.086.01-13.xml", "fx-settlement-previous-hash": "a".repeat(64), "fx-settlement-current-hash": "b".repeat(64),
    };
    for (const [id, value] of Object.entries(values)) fireEvent.change(screen.getByLabelText(id.includes("contracts") ? "Contratos" : id.includes("previous-quote") ? "Ajuste anterior (BRL/USD 1.000)" : id.includes("current-quote") ? "Ajuste atual (BRL/USD 1.000)" : id.includes("previous-asof") ? "Data-base anterior" : id.includes("current-asof") ? "Data-base atual" : id.includes("previous-file") ? "Arquivo B3 anterior" : id.includes("current-file") ? "Arquivo B3 atual" : id.includes("previous-hash") ? "SHA-256 anterior" : "SHA-256 atual"), { target: { value } });
    expect(button).toHaveProperty("disabled", false);
    fireEvent.click(button);
    expect(mocks.refetch).toHaveBeenCalled();
  });
});

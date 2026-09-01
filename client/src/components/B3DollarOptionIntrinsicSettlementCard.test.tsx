// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ useQuery: vi.fn(), refetch: vi.fn() }));
vi.mock("@/lib/trpc", () => ({ trpc: { hedge: { b3DollarOptionIntrinsicSettlement: { useQuery: mocks.useQuery } } } }));
import B3DollarOptionIntrinsicSettlementCard from "./B3DollarOptionIntrinsicSettlementCard";
afterEach(() => cleanup());

describe("B3DollarOptionIntrinsicSettlementCard", () => {
  it("bloqueia o cálculo sem série, preço e hash B3 e o habilita após evidência completa", () => {
    mocks.useQuery.mockReturnValue({ data: undefined, isFetching: false, isError: false, refetch: mocks.refetch });
    render(<B3DollarOptionIntrinsicSettlementCard />);
    const button = screen.getByRole("button", { name: "Calcular intrínseco" });
    expect(button).toHaveProperty("disabled", true);
    const fields: Array<[string, string]> = [["Contratos", "2"], ["Strike (BRL/USD)", "5.2"], ["Liquidação do objeto (BRL/USD)", "5.3"], ["Data-base B3", "2026-08-13"], ["Arquivo B3 da liquidação", "BVBG.086.01.xml"], ["SHA-256 do arquivo B3", "a".repeat(64)]];
    for (const [label, value] of fields) fireEvent.change(screen.getByLabelText(label), { target: { value } });
    expect(button).toHaveProperty("disabled", false);
    fireEvent.click(button);
    expect(mocks.refetch).toHaveBeenCalled();
  });
});

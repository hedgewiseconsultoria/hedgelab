// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ useQuery: vi.fn(), refetch: vi.fn() }));
vi.mock("@/lib/trpc", () => ({ trpc: { hedge: { b3CornOptionIntrinsicSettlement: { useQuery: mocks.useQuery } } } }));
import B3CornOptionIntrinsicSettlementCard from "./B3CornOptionIntrinsicSettlementCard";
afterEach(() => cleanup());

describe("B3CornOptionIntrinsicSettlementCard", () => {
  it("bloqueia o exercício sem a evidência B3 e o habilita após os campos obrigatórios", () => {
    mocks.useQuery.mockReturnValue({ data: undefined, isFetching: false, isError: false, refetch: mocks.refetch });
    render(<B3CornOptionIntrinsicSettlementCard />);
    const button = screen.getByRole("button", { name: "Calcular intrínseco" });
    expect(button).toHaveProperty("disabled", true);
    const fields: Array<[string, string]> = [["Contratos", "2"], ["Strike (R$/saca)", "70"], ["Liquidação do objeto (R$/saca)", "72"], ["Data-base B3", "2026-08-17"], ["Arquivo B3 da liquidação", "BVBG.086.01.xml"], ["SHA-256 do arquivo B3", "a".repeat(64)]];
    for (const [label, value] of fields) fireEvent.change(screen.getByLabelText(label), { target: { value } });
    expect(button).toHaveProperty("disabled", false);
    fireEvent.click(button);
    expect(mocks.refetch).toHaveBeenCalled();
  });
});

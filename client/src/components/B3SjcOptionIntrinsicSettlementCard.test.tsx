// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ useQuery: vi.fn(), refetch: vi.fn() }));
vi.mock("@/lib/trpc", () => ({ trpc: { hedge: { b3SjcOptionIntrinsicSettlement: { useQuery: mocks.useQuery } } } }));

import B3SjcOptionIntrinsicSettlementCard from "./B3SjcOptionIntrinsicSettlementCard";

afterEach(() => cleanup());

describe("B3SjcOptionIntrinsicSettlementCard", () => {
  it("exige preço em USD por saca e evidência B3 antes da consulta", () => {
    mocks.useQuery.mockReturnValue({ data: undefined, isFetching: false, isError: false, refetch: mocks.refetch });
    render(<B3SjcOptionIntrinsicSettlementCard />);

    const button = screen.getByRole("button", { name: "Calcular intrínseco" });
    expect(button).toHaveProperty("disabled", true);

    for (const [label, value] of [
      ["Contratos", "2"],
      ["Strike (US$/saca)", "12.5"],
      ["Liquidação do objeto (US$/saca)", "13.25"],
      ["Data-base B3", "2026-08-17"],
      ["Arquivo B3 da liquidação", "BVBG.086.01.xml"],
      ["SHA-256 do arquivo B3", "e".repeat(64)],
    ] as Array<[string, string]>) {
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    }

    expect(button).toHaveProperty("disabled", false);
    fireEvent.click(button);
    expect(mocks.refetch).toHaveBeenCalled();
  });
});

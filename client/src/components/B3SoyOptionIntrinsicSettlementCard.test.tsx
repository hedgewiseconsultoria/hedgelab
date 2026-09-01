// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ useQuery: vi.fn(), refetch: vi.fn() }));
vi.mock("@/lib/trpc", () => ({ trpc: { hedge: { b3SoyOptionIntrinsicSettlement: { useQuery: mocks.useQuery } } } }));
import B3SoyOptionIntrinsicSettlementCard from "./B3SoyOptionIntrinsicSettlementCard";
afterEach(() => cleanup());
describe("B3SoyOptionIntrinsicSettlementCard", () => it("exige preço em USD e evidência B3 antes da consulta", () => {
  mocks.useQuery.mockReturnValue({ data: undefined, isFetching: false, isError: false, refetch: mocks.refetch });
  render(<B3SoyOptionIntrinsicSettlementCard />);
  const button = screen.getByRole("button", { name: "Calcular intrínseco" });
  expect(button).toHaveProperty("disabled", true);
  for (const [label, value] of [["Contratos", "2"], ["Strike (US$/t)", "350"], ["Liquidação do objeto (US$/t)", "355"], ["Data-base B3", "2026-08-17"], ["Arquivo B3 da liquidação", "BVBG.086.01.xml"], ["SHA-256 do arquivo B3", "e".repeat(64)]] as Array<[string, string]>) fireEvent.change(screen.getByLabelText(label), { target: { value } });
  expect(button).toHaveProperty("disabled", false); fireEvent.click(button); expect(mocks.refetch).toHaveBeenCalled();
}));

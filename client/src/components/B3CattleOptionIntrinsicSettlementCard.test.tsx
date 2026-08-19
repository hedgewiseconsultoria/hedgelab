// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ useQuery: vi.fn(), refetch: vi.fn() }));
vi.mock("@/lib/trpc", () => ({ trpc: { hedge: { b3CattleOptionIntrinsicSettlement: { useQuery: mocks.useQuery } } } }));
import B3CattleOptionIntrinsicSettlementCard from "./B3CattleOptionIntrinsicSettlementCard";
afterEach(() => cleanup());
describe("B3CattleOptionIntrinsicSettlementCard", () => it("exige os campos oficiais de evidência antes de consultar o motor", () => {
  mocks.useQuery.mockReturnValue({ data: undefined, isFetching: false, isError: false, refetch: mocks.refetch });
  render(<B3CattleOptionIntrinsicSettlementCard />);
  const button = screen.getByRole("button", { name: "Calcular intrínseco" });
  expect(button).toHaveProperty("disabled", true);
  for (const [label, value] of [["Contratos", "2"], ["Strike (R$/arroba)", "350"], ["Liquidação do objeto (R$/arroba)", "345"], ["Data-base B3", "2026-08-17"], ["Arquivo B3 da liquidação", "BVBG.086.01.xml"], ["SHA-256 do arquivo B3", "b".repeat(64)]] as Array<[string, string]>) fireEvent.change(screen.getByLabelText(label), { target: { value } });
  expect(button).toHaveProperty("disabled", false);
  fireEvent.click(button); expect(mocks.refetch).toHaveBeenCalled();
}));

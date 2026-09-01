// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ refetch: vi.fn() }));
vi.mock("@/lib/trpc", () => ({ trpc: { marketData: { bcbSelicSgs: { useQuery: () => ({ data: { dataframe: [{ asOf: "2026-08-17", valuePct: 14.15, seriesCode: 11, unit: "percent" }], lineage: { sourceHashSha256: "a".repeat(64) } }, isFetching: false, isError: false, refetch: mocks.refetch }) } } } }));

import BcbSelicSgsCard from "./BcbSelicSgsCard";

describe("BcbSelicSgsCard", () => {
  it("consulta o período declarado e exibe a observação retornada sem conversão automática", () => {
    render(<BcbSelicSgsCard />);
    expect(screen.getByText("Série SGS 11 — Selic")).toBeTruthy();
    expect(screen.getByText(/14,15%/)).toBeTruthy();
    expect(screen.getByText(/não é convertido automaticamente em taxa over/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Consultar" }));
    expect(mocks.refetch).toHaveBeenCalledTimes(1);
  });
});

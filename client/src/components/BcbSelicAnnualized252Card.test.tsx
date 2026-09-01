// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  refetch: vi.fn(),
  query: {
    data: { dataframe: [{ asOf: "2026-08-17", valuePct: 13.9, seriesCode: 1178 }], lineage: { sourceHashSha256: "a".repeat(64) } } as { dataframe: Array<{ asOf: string; valuePct: number; seriesCode: number }>; lineage: { sourceHashSha256: string } } | undefined,
    isFetching: false,
    isError: false,
  },
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    marketData: {
      bcbSelicAnnualized252: {
        useQuery: () => ({ ...mocks.query, refetch: mocks.refetch }),
      },
    },
  },
}));

import BcbSelicAnnualized252Card from "./BcbSelicAnnualized252Card";

describe("BcbSelicAnnualized252Card", () => {
  afterEach(() => {
    cleanup();
    mocks.refetch.mockClear();
    mocks.query = { data: { dataframe: [{ asOf: "2026-08-17", valuePct: 13.9, seriesCode: 1178 }], lineage: { sourceHashSha256: "a".repeat(64) } }, isFetching: false, isError: false };
  });

  it("consulta a série 1178 anualizada publicada diretamente pelo BCB sem derivação da série 11", () => {
    render(<BcbSelicAnnualized252Card />);

    expect(screen.getByText("Série SGS 1178 — Selic anualizada base 252")).toBeTruthy();
    expect(screen.getByText(/não calcula nem substitui valores a partir da série SGS 11/i)).toBeTruthy();
    expect(screen.getByText("13,9% a.a.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Consultar" }));
    expect(mocks.refetch).toHaveBeenCalledTimes(1);
  });

  it("expõe um estado de erro sem substituir a fonte oficial por taxa calculada", () => {
    mocks.query = { data: undefined, isFetching: false, isError: true };
    render(<BcbSelicAnnualized252Card />);

    expect(screen.getByText(/Nenhuma taxa foi calculada como substituta/i)).toBeTruthy();
  });

  it("desabilita a nova consulta enquanto a fonte oficial está em carregamento", () => {
    mocks.query = { data: undefined, isFetching: true, isError: false };
    render(<BcbSelicAnnualized252Card />);

    expect(screen.getByRole("button", { name: "Consultar" }).hasAttribute("disabled")).toBe(true);
  });
});

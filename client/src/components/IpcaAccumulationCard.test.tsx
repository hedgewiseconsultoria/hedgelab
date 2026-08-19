// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ useQuery: vi.fn() }));
vi.mock("@/lib/trpc", () => ({ trpc: { marketData: { ipcaAccumulated: { useQuery: mocks.useQuery } } } }));
import IpcaAccumulationCard from "./IpcaAccumulationCard";

afterEach(() => { cleanup(); vi.clearAllMocks(); });
const result = { method: "IBGE_IPCA_1737_2266_INDEX_RATIO", startPeriod: "202601", endPeriod: "202602", basePeriod: "202512", localityId: "1", localityName: "Brasil", baseIndex: 100, finalIndex: 100.902, accumulatedFactor: 1.00902, accumulatedPct: 0.902, indexObservations: [{ period: "202512", indexValue: 100, sourceUrl: "https://ibge.gov.br/1", sourceFile: "1737-2266-202512.json", sourceAsOf: "2025-12-01", sourceHashSha256: "a".repeat(64) }, { period: "202602", indexValue: 100.902, sourceUrl: "https://ibge.gov.br/2", sourceFile: "1737-2266-202602.json", sourceAsOf: "2026-02-01", sourceHashSha256: "b".repeat(64) }], limitations: ["Quociente do índice."] };

describe("IpcaAccumulationCard", () => {
  it("bloqueia a consulta sem intervalo explícito", () => {
    mocks.useQuery.mockReturnValue({ data: undefined, isFetching: false, isError: false, refetch: vi.fn() });
    render(<IpcaAccumulationCard />);
    expect((screen.getByRole("button", { name: "Calcular" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/A consulta oficial não é iniciada/i)).toBeTruthy();
  });
  it("mostra os números-índice e publica o snapshot com hashes oficiais", () => {
    mocks.useQuery.mockReturnValue({ data: result, isFetching: false, isError: false, refetch: vi.fn() });
    const onSnapshot = vi.fn();
    render(<IpcaAccumulationCard onSnapshot={onSnapshot} />);
    fireEvent.change(screen.getByLabelText("Competência inicial (AAAAMM)"), { target: { value: "202601" } });
    fireEvent.change(screen.getByLabelText("Competência final (AAAAMM)"), { target: { value: "202602" } });
    expect(screen.getByText("Fator de correção")).toBeTruthy();
    expect(screen.getByText("1737-2266-202602.json")).toBeTruthy();
    expect(onSnapshot).toHaveBeenLastCalledWith(expect.objectContaining({ calculations: [expect.objectContaining({ method: "IBGE_IPCA_1737_2266_INDEX_RATIO" })] }));
  });
});

// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ mutate: vi.fn(), options: null as { onSuccess?: (result: any) => void } | null }));

vi.mock("@/lib/trpc", () => ({
  trpc: { marketData: { collectOfficialDataset: { useMutation: (options: any) => { mocks.options = options; return { mutate: mocks.mutate, isPending: false }; } } } },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import OfficialManualCollectionCard from "./OfficialManualCollectionCard";

describe("OfficialManualCollectionCard", () => {
  it("coleta PTAX e IPCA com parâmetros oficiais e exibe os artefatos auditáveis retornados", () => {
    render(<OfficialManualCollectionCard />);

    fireEvent.click(screen.getByRole("button", { name: "Coletar agora" }));
    expect(mocks.mutate).toHaveBeenCalledWith({ sourceId: "BCB_PTAX", asOf: "2026-08-13" });
    act(() => mocks.options?.onSuccess?.({ sourceId: "BCB_PTAX", records: 1, columns: ["cotacaoVenda"], lineage: { sourceUrl: "https://olinda.bcb.gov.br/ptax", sourceHashSha256: "a".repeat(64) }, raw: { storageUrl: "/raw" }, csv: { storageUrl: "/csv" }, manifest: { storageUrl: "/manifest" } }));
    expect(screen.getByText("BCB_PTAX validada")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Payload bruto" }).getAttribute("href")).toBe("/raw");

    fireEvent.change(screen.getByLabelText("Fonte oficial"), { target: { value: "IBGE_IPCA" } });
    fireEvent.change(screen.getByLabelText("Competência"), { target: { value: "202607" } });
    fireEvent.click(screen.getByRole("button", { name: "Coletar agora" }));
    expect(mocks.mutate).toHaveBeenLastCalledWith({ sourceId: "IBGE_IPCA", period: "202607" });

    fireEvent.change(screen.getByLabelText("Fonte oficial"), { target: { value: "ANBIMA_ETTJ" } });
    fireEvent.click(screen.getByRole("button", { name: "Coletar agora" }));
    expect(mocks.mutate).toHaveBeenLastCalledWith({ sourceId: "ANBIMA_ETTJ" });

    fireEvent.change(screen.getByLabelText("Fonte oficial"), { target: { value: "BCB_SGS_1178_SELIC_AA252" } });
    fireEvent.change(screen.getByLabelText("Data inicial"), { target: { value: "2026-08-01" } });
    fireEvent.change(screen.getByLabelText("Data final"), { target: { value: "2026-08-17" } });
    fireEvent.click(screen.getByRole("button", { name: "Coletar agora" }));
    expect(mocks.mutate).toHaveBeenLastCalledWith({ sourceId: "BCB_SGS_1178_SELIC_AA252", startDate: "2026-08-01", endDate: "2026-08-17" });

    fireEvent.change(screen.getByLabelText("Fonte oficial"), { target: { value: "FGV_IGPM" } });
    fireEvent.change(screen.getByLabelText("URL oficial da publicação"), { target: { value: "https://portal.fgv.br/noticias/igp-m-2026" } });
    fireEvent.change(screen.getByLabelText("Ano"), { target: { value: "2026" } });
    fireEvent.click(screen.getByRole("button", { name: "Coletar agora" }));
    expect(mocks.mutate).toHaveBeenLastCalledWith({ sourceId: "FGV_IGPM", sourceUrl: "https://portal.fgv.br/noticias/igp-m-2026", year: 2026 });
  });
});

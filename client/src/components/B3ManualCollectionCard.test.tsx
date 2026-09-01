// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mutate = vi.fn();
const state = { data: undefined as any, isPending: false, isError: false, error: new Error("Falha B3 de teste") };
vi.mock("@/lib/trpc", () => ({ trpc: { marketData: { collectB3Reports: { useMutation: vi.fn(() => ({ mutate, data: state.data, isPending: state.isPending, isError: state.isError, error: state.error })) } } } }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() } }));
import B3ManualCollectionCard from "./B3ManualCollectionCard";

afterEach(() => { cleanup(); mutate.mockReset(); state.data = undefined; state.isPending = false; state.isError = false; state.error = new Error("Falha B3 de teste"); });

describe("B3ManualCollectionCard", () => {
  it("inclui o InstrumentReport no fluxo manual", async () => {
    render(<B3ManualCollectionCard />);
    fireEvent.click(screen.getByRole("button", { name: "Coletar agora" }));
    await waitFor(() => expect(mutate).toHaveBeenCalledWith({ asOf: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), reportTypes: ["BVBG.086.01", "BVBG.187.01", "BVBG.028.02"], normalize: false, persistRaw: false, collectionMode: "manual" }));
  });

  it("usa o perfil curto e seguro na atualização automática", async () => {
    render(<B3ManualCollectionCard autoCollect />);
    await waitFor(() => expect(mutate).toHaveBeenCalledWith({ asOf: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), reportTypes: ["BVBG.086.01", "BVBG.187.01", "BVBG.028.02"], normalize: false, persistRaw: false, collectionMode: "automatic" }));
  });

  it("publica somente arquivos B3 disponíveis na linhagem da sessão", async () => {
    state.data = { availability: "available", reports: [{ availability: "available", availabilityReason: null, attempts: 1, reportType: "BVBG.086.01", officialDownloadUrl: "https://www.b3.com.br/pesquisapregao/download?filelist=PR260817.zip,", sourceAsOf: "2026-08-17", validationStatus: "downloaded", outerArchive: { filename: "PR.zip", bytes: 1, sha256: "a".repeat(64) }, innerArchive: { filename: "PR.inner.zip", bytes: 1 }, xmlFiles: [{ filename: "BVBG.086.01.xml", bytes: 1, sha256: "b".repeat(64) }], normalizations: [] }] };
    const onLineage = vi.fn();
    render(<B3ManualCollectionCard onLineage={onLineage} />);
    await waitFor(() => expect(onLineage).toHaveBeenCalledWith([expect.objectContaining({ source_file: "BVBG.086.01.xml", source_asof: "2026-08-17" })]));
  });

  it("mantém carregamento, falha técnica e dados oficiais em estados distintos", () => {
    const { rerender } = render(<B3ManualCollectionCard />);
    state.isPending = true;
    rerender(<B3ManualCollectionCard />);
    expect(screen.getByText(/Atualização em andamento/i)).toBeTruthy();
    state.isPending = false;
    state.isError = true;
    state.error = new Error("A B3 respondeu 404");
    rerender(<B3ManualCollectionCard />);
    expect(screen.getByRole("alert").textContent).toMatch(/Nenhum arquivo, preço ou DataFrame B3 foi publicado/i);
    expect(screen.queryByText(/A B3 respondeu 404/i)).toBeNull();
  });

  it("mostra boletim indisponível como bloqueado e sem evidência publicada", () => {
    state.data = { availability: "partial", reports: [{ availability: "unavailable", availabilityReason: "A B3 não respondeu dentro da janela de atualização. Nenhum dado substituto foi utilizado; tente novamente mais tarde.", attempts: 1, reportType: "BVBG.028.02", sourceAsOf: "2026-08-17", officialDownloadUrl: null, validationStatus: null, outerArchive: null, innerArchive: null, xmlFiles: [], normalizations: [] }] };
    render(<B3ManualCollectionCard />);
    expect(screen.getByText(/BVBG\.028\.02 · indisponível/i)).toBeTruthy();
    expect(screen.getByText(/Cálculos dependentes deste boletim permanecem bloqueados/i)).toBeTruthy();
  });
});

// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mutate = vi.fn();
const state = { data: undefined as any, isPending: false, isError: false, error: new Error("Falha B3 de teste") };
vi.mock("@/lib/trpc", () => ({ trpc: { marketData: { collectB3Reports: { useMutation: vi.fn(() => ({ mutate, data: state.data, isPending: state.isPending, isError: state.isError, error: state.error })) } } } }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
import B3ManualCollectionCard from "./B3ManualCollectionCard";

describe("B3ManualCollectionCard", () => {
  afterEach(() => {
    cleanup();
    mutate.mockReset();
    state.data = undefined;
    state.isPending = false;
    state.isError = false;
    state.error = new Error("Falha B3 de teste");
  });

  it("inclui o InstrumentReport BVBG.028.02 junto aos boletins B3 selecionados", async () => {
    render(<B3ManualCollectionCard />);
    expect(screen.getByRole("button", { name: "BVBG.028.02" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Coletar agora" }));
    await waitFor(() => expect(mutate).toHaveBeenCalledWith({
      asOf: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      reportTypes: ["BVBG.086.01", "BVBG.187.01", "BVBG.028.02"],
      normalize: false,
      persistRaw: false,
    }));
  });

  it("na abertura preserva primeiro os boletins oficiais sem normalizar o InstrumentReport volumoso", async () => {
    render(<B3ManualCollectionCard autoCollect />);
    await waitFor(() => expect(mutate).toHaveBeenCalledWith({
      asOf: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      reportTypes: ["BVBG.086.01", "BVBG.187.01", "BVBG.028.02"],
      normalize: false,
      persistRaw: false,
    }));
    expect(screen.queryByRole("button", { name: "Coletar agora" })).toBeNull();
  });

  it("publica arquivos, hashes e data-base dos XMLs oficiais à sessão", async () => {
    state.data = { reports: [{ reportType: "BVBG.086.01", officialDownloadUrl: "https://www.b3.com.br/pesquisapregao/download?filelist=PR260817.zip,", sourceAsOf: "2026-08-17", validationStatus: "downloaded", outerArchive: { filename: "PR.zip", bytes: 1, sha256: "a".repeat(64) }, innerArchive: { filename: "PR.inner.zip", bytes: 1 }, xmlFiles: [{ filename: "BVBG.086.01.xml", bytes: 1, sha256: "b".repeat(64) }], normalizations: [] }] };
    const onLineage = vi.fn();
    render(<B3ManualCollectionCard key="data-lineage" onLineage={onLineage} />);
    await waitFor(() => expect(onLineage).toHaveBeenCalledWith([expect.objectContaining({ source_file: "BVBG.086.01.xml", source_asof: "2026-08-17", source_hash_sha256: "b".repeat(64) })]));
  });

  it("separa estado vazio, carregamento, erro e evidência B3 publicada", () => {
    const { rerender } = render(<B3ManualCollectionCard />);
    expect(screen.queryByText("PR.zip")).toBeNull();

    state.isPending = true;
    rerender(<B3ManualCollectionCard key="pending" />);
    expect(screen.getByText(/Baixando, verificando ZIPs/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Coletar agora" }).hasAttribute("disabled")).toBe(true);

    state.isPending = false;
    state.isError = true;
    state.error = new Error("A B3 respondeu 404 ao solicitar PR260813.zip.");
    rerender(<B3ManualCollectionCard key="error" />);
    expect(screen.getByRole("alert").textContent).toMatch(/Nenhum arquivo ou DataFrame foi publicado/i);
    expect(screen.getByText(/A B3 respondeu 404/i)).toBeTruthy();

    state.isError = false;
    state.data = { reports: [{ reportType: "BVBG.086.01", officialDownloadUrl: "https://www.b3.com.br/pesquisapregao/download?filelist=PR260817.zip,", sourceAsOf: "2026-08-17", validationStatus: "downloaded", outerArchive: { filename: "PR.zip", bytes: 1_200_000, sha256: "a".repeat(64) }, innerArchive: { filename: "PR.inner.zip", bytes: 1 }, xmlFiles: [{ filename: "BVBG.086.01.xml", bytes: 1, sha256: "b".repeat(64) }], normalizations: [] }] };
    rerender(<B3ManualCollectionCard key="data" />);
    expect(screen.getByText(/PR\.zip/)).toBeTruthy();
    expect(screen.getByText(/SHA-256 a{8}/i)).toBeTruthy();
  });

  it("mantém múltiplos relatórios, XMLs e normalizações B3 em estado denso", () => {
    const reports = ["BVBG.086.01", "BVBG.187.01", "BVBG.028.02"].map((reportType, reportIndex) => ({
      reportType,
      officialDownloadUrl: `https://www.b3.com.br/pesquisapregao/download?filelist=R${reportIndex}.zip,`,
      sourceAsOf: "2026-08-13",
      validationStatus: "downloaded",
      outerArchive: { filename: `R${reportIndex}.zip`, bytes: 1_200_000 + reportIndex, sha256: `${reportIndex}`.repeat(64) },
      innerArchive: { filename: `R${reportIndex}.inner.zip`, bytes: 500_000 + reportIndex },
      xmlFiles: Array.from({ length: 4 }, (_, xmlIndex) => ({ filename: `${reportType}_${xmlIndex}.xml`, bytes: 100_000 + xmlIndex, sha256: `${xmlIndex}`.repeat(64) })),
      normalizations: Array.from({ length: 2 }, (_, normalizationIndex) => ({ sourceFile: `${reportType}_${normalizationIndex}.xml`, records: 2_000 + normalizationIndex, columns: ["symbol", "maturity"], validationStatus: "valid", issueCount: 0, csv: { storageUrl: `https://example.com/${reportIndex}-${normalizationIndex}.csv` }, manifest: { storageUrl: `https://example.com/${reportIndex}-${normalizationIndex}.manifest.json` } })),
    }));
    state.data = { reports };
    render(<B3ManualCollectionCard />);

    expect(screen.getAllByText("BVBG.086.01")).toHaveLength(2);
    expect(screen.getAllByText("BVBG.187.01")).toHaveLength(2);
    expect(screen.getAllByText("BVBG.028.02")).toHaveLength(2);
    expect(screen.getAllByText("DataFrames normalizados e persistidos")).toHaveLength(3);
    expect(screen.getAllByText("CSV auditável")).toHaveLength(6);
    expect(screen.getAllByText(/SHA-256 00000000/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/SHA-256 11111111/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/SHA-256 22222222/i).length).toBeGreaterThan(0);
  });
});

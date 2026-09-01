// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mutate = vi.fn();
const state = { data: undefined as any, isPending: false, isError: false, error: new Error("Falha de teste B3") };
vi.mock("@/lib/trpc", () => ({ trpc: { marketData: { collectB3DiFutureCurve: { useMutation: vi.fn(() => ({ mutate, isPending: state.isPending, isError: state.isError, error: state.error, data: state.data })) } } } }));
import B3DiFutureCurveCard from "./B3DiFutureCurveCard";

describe("B3DiFutureCurveCard", () => {
  afterEach(() => {
    cleanup();
    mutate.mockReset();
    state.data = undefined;
    state.isPending = false;
    state.isError = false;
    state.error = new Error("Falha de teste B3");
  });

  it("dispara coleta pela data-base B3 e não oferece interpolação como alternativa", async () => {
    render(<B3DiFutureCurveCard />);
    fireEvent.click(screen.getByRole("button", { name: "Coletar vértices DI1" }));
    await waitFor(() => expect(mutate).toHaveBeenCalledWith({ asOf: "2026-08-13" }));
    expect(screen.getByText(/Não há interpolação, taxa forward, MTM ou taxa substituta/i)).toBeTruthy();
  });

  it("inicia a consulta oficial automaticamente quando a jornada CDI-DI1 define a data-base", async () => {
    render(<B3DiFutureCurveCard autoCollect initialAsOf="2026-08-19" contextual />);
    await waitFor(() => expect(mutate).toHaveBeenCalledWith({ asOf: "2026-08-19" }));
    expect(screen.queryByRole("button", { name: /Coletar vértices DI1/i })).toBeNull();
    expect(screen.getByRole("status").textContent).toMatch(/consulta oficial/i);
  });

  it("publica somente os vértices B3 e sua referência de data-base ao dashboard", () => {
    state.data = { marketAssociationStatus: "valid", curve: { dataframe: [{ curve_point_id: "DI1-1", asof: "2026-08-13", instrument_id: "1", symbol: "DI1U26", maturity: "2026-09-01", adjusted_rate_pct_aa252: 14.1, business_days_to_maturity: 13, business_days_status: "validated", quotation_convention: "EFFECTIVE_ANNUAL_RATE_AA_252_PUBLISHED_BY_B3", source_file: "PR.xml", source_hash_sha256: "a".repeat(64) }], status: "valid_market_vertices", asof: "2026-08-13", calendarId: "B3_TRADING_2026", issues: [], limitations: [], csv: { storageUrl: "https://example.com/curve.csv" }, manifest: { storageUrl: "https://example.com/manifest.json" } } };
    const onCurve = vi.fn();
    render(<B3DiFutureCurveCard onCurve={onCurve} />);
    expect(onCurve).toHaveBeenCalledWith(expect.objectContaining({ asof: "2026-08-13", dataframe: [expect.objectContaining({ symbol: "DI1U26" })] }));
  });

  it("separa estados vazio, carregamento, erro e dados B3 publicados", () => {
    const { rerender } = render(<B3DiFutureCurveCard />);
    expect(screen.queryByText("DI1U26")).toBeNull();

    state.isPending = true;
    rerender(<B3DiFutureCurveCard />);
    expect(screen.getByRole("button", { name: /Coletar vértices DI1/i }).hasAttribute("disabled")).toBe(true);

    state.isPending = false;
    state.isError = true;
    state.error = new Error("Arquivo B3 indisponível para a data-base");
    rerender(<B3DiFutureCurveCard />);
    expect(screen.getByText(/Nenhuma curva alternativa foi estimada/i)).toBeTruthy();
    expect(screen.queryByText(/Arquivo B3 indisponível/i)).toBeNull();
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeTruthy();

    state.isError = false;
    state.data = { marketAssociationStatus: "valid", curve: { dataframe: [{ curve_point_id: "DI1-1", asof: "2026-08-13", instrument_id: "1", symbol: "DI1U26", maturity: "2026-09-01", adjusted_rate_pct_aa252: 14.1, business_days_to_maturity: 13, business_days_status: "validated", quotation_convention: "EFFECTIVE_ANNUAL_RATE_AA_252_PUBLISHED_BY_B3", source_file: "PR.xml", source_hash_sha256: "a".repeat(64) }], status: "valid_market_vertices", asof: "2026-08-13", calendarId: "B3_TRADING_2026", issues: [], limitations: [], csv: { storageUrl: "https://example.com/curve.csv" }, manifest: { storageUrl: "https://example.com/manifest.json" } } };
    rerender(<B3DiFutureCurveCard />);
    expect(screen.getByText("DI1U26")).toBeTruthy();
    expect(screen.getByText(/1 vértice\(s\) · associação valid/i)).toBeTruthy();
    expect((screen.getByLabelText("Data-base B3") as HTMLInputElement).disabled).toBe(false);
    expect(screen.getByRole("button", { name: "Coletar vértices DI1" }).hasAttribute("disabled")).toBe(false);
  });

  it("permite inspeção visual de carregamento sem mutar ou simular dados de mercado", () => {
    render(<B3DiFutureCurveCard visualLoading />);

    expect(screen.getByRole("button", { name: "Coletar vértices DI1" }).hasAttribute("disabled")).toBe(true);
    expect((screen.getByLabelText("Data-base B3") as HTMLInputElement).disabled).toBe(true);
    expect(screen.queryByText(/vértice\(s\) · associação/i)).toBeNull();
    expect(mutate).not.toHaveBeenCalled();
  });

  it("libera data-base e botão após watchdog local, preservando bloqueio seguro sem expor erro técnico", () => {
    vi.useFakeTimers();
    state.isPending = true;
    const { rerender } = render(<B3DiFutureCurveCard />);
    expect((screen.getByLabelText("Data-base B3") as HTMLInputElement).disabled).toBe(true);
    act(() => { vi.advanceTimersByTime(65_000); });
    expect((screen.getByLabelText("Data-base B3") as HTMLInputElement).disabled).toBe(false);
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeTruthy();
    expect(screen.getByText(/Nenhuma curva alternativa foi estimada/i)).toBeTruthy();
    state.isPending = false;
    state.isError = true;
    state.error = new Error("Timeout oficial B3");
    rerender(<B3DiFutureCurveCard />);
    expect(screen.queryByText(/Timeout oficial B3/i)).toBeNull();
    vi.useRealTimers();
  });

  it("mantém múltiplos vértices B3 auditáveis em estado denso", () => {
    state.data = { marketAssociationStatus: "valid", curve: { dataframe: Array.from({ length: 12 }, (_, index) => ({ curve_point_id: `DI1-${index}`, asof: "2026-08-13", instrument_id: `${index}`, symbol: `DI1${String(index + 1).padStart(2, "0")}Z26`, maturity: "2026-12-01", adjusted_rate_pct_aa252: 14.1 + index / 100, business_days_to_maturity: 13 + index, business_days_status: "validated", quotation_convention: "EFFECTIVE_ANNUAL_RATE_AA_252_PUBLISHED_BY_B3", source_file: `PR-${index}.xml`, source_hash_sha256: `${index}`.padStart(64, "a") })), status: "valid_market_vertices", asof: "2026-08-13", calendarId: "B3_TRADING_2026", issues: [], limitations: [], csv: { storageUrl: "https://example.com/curve.csv" }, manifest: { storageUrl: "https://example.com/manifest.json" } } };
    render(<B3DiFutureCurveCard />);

    expect(screen.getByText(/12 vértice\(s\) · associação valid/i)).toBeTruthy();
    expect(screen.getByText("DI101Z26")).toBeTruthy();
    expect(screen.getByText("DI112Z26")).toBeTruthy();
    expect(screen.getByTitle(`0`.padStart(64, "a")).textContent).toMatch(/PR-0\.xml/);
    expect(screen.getByTitle(`11`.padStart(64, "a")).textContent).toMatch(/PR-11\.xml/);
  });
});

// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockMaster = [
  { instrumentKey: "DOL", kind: "B3_FX_FUTURE", description: "Futuro de dólar", evidence: { sourceUrl: "https://www.b3.com.br/dol", sourceFile: "dol.html", sourceHashSha256: "a".repeat(64), capturedAtUtc: "2026-08-17T00:00:00.000Z" } },
  { instrumentKey: "CCM", kind: "B3_COMMODITY_FUTURE", description: "Futuro de milho", evidence: { sourceUrl: "https://www.b3.com.br/ccm", sourceFile: "ccm.html", sourceHashSha256: "b".repeat(64), capturedAtUtc: "2026-08-18T05:08:32.000Z" } },
  { instrumentKey: "CCM_OPTION", kind: "B3_COMMODITY_OPTION", description: "Opção sobre futuro de milho", evidence: { sourceUrl: "https://www.b3.com.br/ccm-option", sourceFile: "ccm-option.html", sourceHashSha256: "c".repeat(64), capturedAtUtc: "2026-08-18T05:50:00.000Z" } },
];
vi.mock("@/lib/trpc", () => ({ trpc: { marketData: { officialInstrumentMaster: { useQuery: () => ({ data: mockMaster, isLoading: false }) } } } }));

import B3InstrumentMasterSelector from "./B3InstrumentMasterSelector";

afterEach(() => cleanup());

describe("B3InstrumentMasterSelector", () => {
  it("adiciona somente a especificação oficial, marcando que não há série B3 selecionada", () => {
    const onSelected = vi.fn();
    render(<B3InstrumentMasterSelector onSelected={onSelected} />);
    fireEvent.click(screen.getByRole("button", { name: "Adicionar especificação à sessão" }));
    expect(onSelected).toHaveBeenCalledWith(expect.objectContaining({ instrument_id: "B3_PRODUCT_SPEC::DOL", source: "B3_PRODUCT_SPECIFICATION", series_status: "no_b3_series_selected", evidence_sha256: "a".repeat(64) }));
  });

  it("disponibiliza a especificação de commodity sem selecionar série ou vencimento", () => {
    const onSelected = vi.fn();
    render(<B3InstrumentMasterSelector onSelected={onSelected} />);
    fireEvent.change(screen.getByLabelText("Especificação oficial"), { target: { value: "CCM" } });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar especificação à sessão" }));
    expect(onSelected).toHaveBeenCalledWith(expect.objectContaining({ instrument_id: "B3_PRODUCT_SPEC::CCM", product_kind: "B3_COMMODITY_FUTURE", evidence_sha256: "b".repeat(64), series_status: "no_b3_series_selected" }));
  });

  it("adiciona a ficha específica de opção de commodity sem inferir série ou preço", () => {
    const onSelected = vi.fn();
    render(<B3InstrumentMasterSelector onSelected={onSelected} />);
    fireEvent.change(screen.getByLabelText("Especificação oficial"), { target: { value: "CCM_OPTION" } });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar especificação à sessão" }));
    expect(onSelected).toHaveBeenCalledWith(expect.objectContaining({ instrument_id: "B3_PRODUCT_SPEC::CCM_OPTION", product_kind: "B3_COMMODITY_OPTION", evidence_sha256: "c".repeat(64), series_status: "no_b3_series_selected" }));
  });
});

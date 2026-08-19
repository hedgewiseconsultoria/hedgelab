// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ persist: vi.fn(), create: vi.fn(), toastError: vi.fn(), toastSuccess: vi.fn() }));
vi.mock("@/lib/trpc", () => ({ trpc: { hedge: {
  persistOtcContractEvidence: { useMutation: () => ({ mutate: mocks.persist, isPending: false }) },
  createOtcInstrumentMaster: { useMutation: () => ({ mutate: mocks.create, isPending: false }) },
} } }));
vi.mock("sonner", () => ({ toast: { error: mocks.toastError, success: mocks.toastSuccess } }));
import OtcContractMasterCard from "./OtcContractMasterCard";

describe("OtcContractMasterCard", () => {
  afterEach(() => {
    cleanup();
    mocks.persist.mockReset();
    mocks.create.mockReset();
    mocks.toastError.mockReset();
    mocks.toastSuccess.mockReset();
  });

  it("exibe somente os campos contratuais próprios do swap de taxa e preserva seus bloqueios", () => {
    render(<OtcContractMasterCard />);
    fireEvent.change(screen.getByLabelText("Tipo"), { target: { value: "OTC_RATE_SWAP" } });

    expect((screen.getByRole("option", { name: "Swap de taxa bilateral" }) as HTMLOptionElement).selected).toBe(true);
    expect(screen.getByLabelText("Nocional contratual em BRL")).toBeTruthy();
    expect(screen.getByLabelText("Indexador da perna flutuante")).toBeTruthy();
    expect(screen.getByLabelText("Convenção da perna fixa")).toBeTruthy();
    expect(screen.getByLabelText("Calendário de pagamentos")).toBeTruthy();
    expect(screen.getByText(/Precificação, MTM, curva, taxa over, DV01, valor justo e resultado financeiro continuam bloqueados/i)).toBeTruthy();
    expect(screen.queryByLabelText("Indexador da perna estrangeira")).toBeNull();
  });

  it("mantém bloqueada a criação sem evidência hasheada", () => {
    render(<OtcContractMasterCard />);
    const button = screen.getByRole("button", { name: /Criar Instrument Master/i });

    expect(button.hasAttribute("disabled")).toBe(true);
    expect(mocks.create).not.toHaveBeenCalled();
  });
});

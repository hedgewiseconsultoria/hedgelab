// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/trpc", () => ({
  trpc: {
    hedge: {
      bcbTraditionalFxSwapScenario: {
        useQuery: () => ({ data: undefined, isFetching: false, isError: false, refetch: vi.fn() }),
      },
    },
  },
}));

import FxSwapScenarioCard from "./FxSwapScenarioCard";

afterEach(cleanup);

const master = {
  instrument_id: "SWAP-USD-001",
  kind: "OTC_FX_SWAP" as const,
  base_currency: "USD" as const,
  quote_currency: "BRL" as const,
  notional_base_currency: 100_000,
  trade_date: "2026-08-01",
  maturity: "2026-10-01",
  settlement_convention: "D+1 conforme contrato",
  terms: { domesticLegIndex: "Selic", foreignLegIndex: "USD + cupom", startDate: "2026-08-01", endDate: "2026-10-01" },
  source: "USER_CONTRACT" as const,
  evidence_source_file: "swap.pdf",
  evidence_source_url: null,
  evidence_sha256: "a".repeat(64),
  evidence_captured_at_utc: "2026-08-19T00:00:00.000Z",
  validation_status: "validated_user_contract" as const,
};

describe("FxSwapScenarioCard", () => {
  it("bloqueia o cálculo sem contrato OTC hasheado e designação explícita", () => {
    render(<FxSwapScenarioCard instrumentMasterRows={[]} hedgeRows={[]} />);

    expect(screen.queryAllByText((_, element) => element?.textContent?.includes("Crie primeiro um Instrument Master de swap cambial") ?? false).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Calcular fluxo" })).toHaveProperty("disabled", true);
  });

  it("mantém o botão bloqueado até receber parâmetros e hashes oficiais completos", () => {
    render(<FxSwapScenarioCard instrumentMasterRows={[master]} hedgeRows={[{ hedge_id: "hedge-001", exposure_id: "exp-usd", instrument_id: "SWAP-USD-001", strategy: "SWAP_CAMBIAL_CONTRATUAL", quantity: 1, trade_date: "2026-08-01", maturity: "2026-10-01", method_version: "otc-contract-master-v1" }]} />);

    fireEvent.change(screen.getByLabelText("Contrato OTC de swap cambial"), { target: { value: "SWAP-USD-001" } });
    fireEvent.change(screen.getByLabelText("Nocional USD contratual"), { target: { value: "100000" } });
    fireEvent.change(screen.getByLabelText("FX inicial declarado (BRL/USD)"), { target: { value: "5,20" } });
    fireEvent.change(screen.getByLabelText("FX final de cenário (BRL/USD)"), { target: { value: "5,30" } });
    fireEvent.change(screen.getByLabelText("Cupom cambial (% a.a./252)"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("Selic (% a.a./252)"), { target: { value: "14" } });
    fireEvent.change(screen.getByLabelText("Dias úteis declarados"), { target: { value: "21" } });
    fireEvent.change(screen.getByLabelText("Data-base PTAX"), { target: { value: "2026-08-13" } });
    fireEvent.change(screen.getByLabelText("Data-base Selic"), { target: { value: "2026-08-13" } });

    expect(screen.getByRole("button", { name: "Calcular fluxo" })).toHaveProperty("disabled", true);
    expect(screen.getByText(/informe data-base e SHA-256 dos artefatos oficiais PTAX e Selic/i)).toBeTruthy();
  });
});

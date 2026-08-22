// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const refetch = vi.fn();
vi.mock("@/lib/trpc", () => ({
  trpc: {
    hedge: {
      diagnoseAlternatives: {
        useQuery: vi.fn(() => ({
          data: {
            diagnosis: { riskFactor: "USD_BRL", adverseMove: "alta de USD/BRL", economicImpact: "aumento do custo em BRL" },
            alternatives: [{ kind: "B3_DOL_FUTURE", label: "Futuro de dólar comercial (DOL)", hedgeDirection: "BUY", status: "eligible_with_market_data", requiredData: ["série DOL"], blockingReason: null }],
            canonicalDataframes: { economic_situation_dataframe: [{ economic_situation_id: "economic::usd", exposure_id: "usd", situation_kind: "USD_PAYABLE", description: "Importação", declared_quantity: 100_000, declared_currency: "USD", horizon_date: "2026-12-15", commodity_reference: null, indexer: null, origin: "USER_DECLARED", captured_at_utc: "2026-08-18T00:00:00.000Z" }], risk_factor_dataframe: [], hedge_alternative_dataframe: [], hedge_sizing_dataframe: [], scenario_result_dataframe: [] },
          },
          isFetching: false,
          isError: false,
          refetch,
        })),
      },
    },
  },
}));
import HedgeDiagnosisCard from "./HedgeDiagnosisCard";

afterEach(() => cleanup());

describe("HedgeDiagnosisCard", () => {
  it("começa pela exposição e apresenta alternativas com requisitos, sem uma recomendação presumida", async () => {
    const onCanonicalDataframes = vi.fn();
    render(<HedgeDiagnosisCard onCanonicalDataframes={onCanonicalDataframes} />);
    expect(screen.getByText("O que a empresa quer proteger?")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Valor financeiro da exposição"), { target: { value: "100000" } });
    fireEvent.change(screen.getByLabelText("Vencimento ou horizonte"), { target: { value: "2026-12-15" } });
    fireEvent.click(screen.getByRole("button", { name: "Registrar e diagnosticar" }));
    await waitFor(() => expect(refetch).toHaveBeenCalled());
    expect(await screen.findByText(/Futuro de dólar comercial \(DOL\)/)).toBeTruthy();
    expect(screen.getByText("Alternativas identificadas")).toBeTruthy();
    expect(screen.queryByText(/recomendação/i)).toBeNull();
    await waitFor(() => expect(onCanonicalDataframes).toHaveBeenCalledWith(expect.objectContaining({ economic_situation_dataframe: [expect.objectContaining({ situation_kind: "USD_PAYABLE" })] })));
  });

  it("aplica o atalho de milho apenas ao contexto econômico e à referência B3", () => {
    render(<HedgeDiagnosisCard />);
    const notional = screen.getByLabelText("Valor financeiro da exposição") as HTMLInputElement;
    const maturity = screen.getByLabelText("Vencimento ou horizonte") as HTMLInputElement;
    const originalNotional = notional.value;
    const originalMaturity = maturity.value;
    fireEvent.click(screen.getByRole("button", { name: "Compra de Milho" }));
    expect((screen.getByLabelText("Variável econômica") as HTMLSelectElement).value).toBe("COMMODITY_PURCHASE");
    expect((screen.getByLabelText("Descrição do compromisso") as HTMLInputElement).value).toMatch(/milho/i);
    expect((screen.getByLabelText("Referência econômica") as HTMLSelectElement).value).toBe("CCM");
    expect(notional.value).toBe(originalNotional);
    expect(maturity.value).toBe(originalMaturity);
  });
});

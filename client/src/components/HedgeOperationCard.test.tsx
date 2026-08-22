// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HedgeOperationCard from "./HedgeOperationCard";

const situation = { economic_situation_id: "sit-gold", exposure_id: "exp-gold", situation_kind: "COMMODITY_PURCHASE" as const, description: "Compra de ouro para produção", declared_quantity: 80, declared_currency: "USD" as const, horizon_date: "2026-12-18", commodity_reference: "GLD" as const, indexer: null, origin: "USER_DECLARED" as const, captured_at_utc: "2026-08-22T00:00:00.000Z" };
const alternative = { alternative_id: "alt-gold", exposure_id: "exp-gold", alternative_kind: "B3_COMMODITY_FUTURE" as const, label: "Futuro de Ouro", risk_factor: "B3_COMMODITY_PRICE" as const, hedge_direction: "BUY" as const, eligibility_status: "eligible_with_market_data" as const, required_data: ["série GLD"], blocking_reason: null, source_ids: ["B3_PUBLIC_FILES"] as Array<"B3_PUBLIC_FILES">, method_version: "hedge-alternatives-v1" as const, economic_situation_id: "sit-gold", risk_factor_id: "risk-gold", origin: "CATALOG_DERIVED" as const };

describe("HedgeOperationCard", () => {
  it("materializa a operação de ouro com os dados declarados e mantém cotação oficial separada da análise didática", () => {
    const onCoverageChange = vi.fn();
    const onOpenSimulation = vi.fn();
    render(<HedgeOperationCard situation={situation} alternative={alternative} coveragePct={100} onCoverageChange={onCoverageChange} onOpenSimulation={onOpenSimulation} />);
    expect(screen.getByText("Futuro de Ouro")).toBeTruthy();
    expect(screen.getByText(/80 onças troy/i)).toBeTruthy();
    expect(screen.getByText("2026-12-18")).toBeTruthy();
    expect(screen.getByText(/Série e cotação B3 ainda não estão vinculadas/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "50%" }));
    expect(onCoverageChange).toHaveBeenCalledWith(50);
    fireEvent.click(screen.getByRole("button", { name: /Comparar cenários de preço e cobertura/i }));
    expect(onOpenSimulation).toHaveBeenCalledTimes(1);
  });
});

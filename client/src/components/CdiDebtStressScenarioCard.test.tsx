// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CdiDebtStressScenarioCard from "./CdiDebtStressScenarioCard";

const situation = { economic_situation_id: "sit-cdi", exposure_id: "exp-cdi", situation_kind: "CDI_LINKED_DEBT" as const, description: "Dívida pós-fixada indexada ao CDI", declared_quantity: 1_250_000, declared_currency: "BRL" as const, horizon_date: "2026-11-16", commodity_reference: null, indexer: "CDI" as const, origin: "USER_DECLARED" as const, captured_at_utc: "2026-08-20T00:00:00.000Z" };
const alternative = { alternative_id: "alt-di1", exposure_id: "exp-cdi", alternative_kind: "B3_DI1_FUTURE" as const, label: "Futuro DI1", risk_factor: "CDI_RATE" as const, hedge_direction: "SELL" as const, eligibility_status: "eligible_with_market_data" as const, required_data: ["vértice"], blocking_reason: null, source_ids: ["B3_PUBLIC_FILES"] as Array<"B3_PUBLIC_FILES">, method_version: "hedge-alternatives-v1" as const, economic_situation_id: "sit-cdi", risk_factor_id: "risk-cdi", origin: "CATALOG_DERIVED" as const };
const curve = { status: "valid_market_vertices" as const, asof: "2026-08-19", calendarId: "B3_TRADING_2026" as const, dataframe: [{ curve_point_id: "di1-1", asof: "2026-08-19", instrument_id: "DI1-1", symbol: "DI1U26", maturity: "2026-09-01", adjusted_rate_pct_aa252: 14.1, business_days_to_maturity: 13, business_days_status: "validated" as const, quotation_convention: "EFFECTIVE_ANNUAL_RATE_AA_252_PUBLISHED_BY_B3" as const, source_file: "PR260819.xml", source_hash_sha256: "a".repeat(64) }], issues: [], limitations: [], csv: { storageUrl: "https://example.com/curve.csv" }, manifest: { storageUrl: "https://example.com/manifest.json" } };

describe("CdiDebtStressScenarioCard", () => {
  afterEach(cleanup);

  it("reutiliza a dívida CDI e o vértice B3 sem presumir resultado do hedge", () => {
    const openAdvanced = vi.fn();
    render(<CdiDebtStressScenarioCard situation={situation} alternative={alternative} curve={curve} onOpenAdvanced={openAdvanced} />);
    expect(screen.getByText(/1\.250\.000,00/)).toBeTruthy();
    expect(screen.getAllByText(/DI1U26/i).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /Simular impacto da dívida/i }));
    expect(screen.getByText(/Encargo adicional sob choque/i)).toBeTruthy();
    expect(screen.getByText(/Resultado do hedge ainda bloqueado/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Abrir ajuste DI1 avançado/i }));
    expect(openAdvanced).toHaveBeenCalledTimes(1);
  });

  it("mantém o cenário bloqueado quando não houver vértice B3 validado", () => {
    render(<CdiDebtStressScenarioCard situation={situation} alternative={alternative} curve={null} onOpenAdvanced={vi.fn()} />);
    expect(screen.getByText(/ainda não possui vértices DI1 válidos/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Simular impacto da dívida/i })).toBeNull();
  });
});

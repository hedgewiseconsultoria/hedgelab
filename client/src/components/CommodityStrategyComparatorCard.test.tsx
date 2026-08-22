// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import CommodityStrategyComparatorCard from "./CommodityStrategyComparatorCard";

afterEach(() => cleanup());

describe("CommodityStrategyComparatorCard", () => {
  it("compara físico, futuro e intrínseco de opção como hipóteses didáticas", () => {
    render(<CommodityStrategyComparatorCard
      situation={{ economic_situation_id: "sit-bgi", exposure_id: "exp-bgi", situation_kind: "COMMODITY_PURCHASE", description: "Compra de boi", declared_quantity: 100, declared_currency: "BRL", horizon_date: "2026-12-15", commodity_reference: "BGI", indexer: null, origin: "USER_DECLARED", captured_at_utc: "2026-08-22T00:00:00.000Z" }}
      alternative={{ alternative_id: "alt-bgi", exposure_id: "exp-bgi", alternative_kind: "B3_COMMODITY_FUTURE", label: "Futuro de Boi Gordo (BGI)", risk_factor: "B3_COMMODITY_PRICE", hedge_direction: "BUY", eligibility_status: "eligible_with_market_data", required_data: ["série BGI"], blocking_reason: null, source_ids: ["B3_PUBLIC_FILES"], method_version: "hedge-alternatives-v1", economic_situation_id: "sit-bgi", risk_factor_id: "risk-bgi", origin: "CATALOG_DERIVED" }}
    />);
    fireEvent.change(screen.getAllByRole("textbox")[0]!, { target: { value: "100" } });
    fireEvent.change(screen.getAllByRole("textbox")[3]!, { target: { value: "105" } });
    expect(screen.getByText("Futuro linear")).toBeTruthy();
    expect(screen.getByText("Opção: somente intrínseco")).toBeTruthy();
    expect(screen.getByText(/Hipótese didática, não preço B3/)).toBeTruthy();
    expect(screen.getByText("EM ANÁLISE")).toBeTruthy();
  });

  it("configura venda física com futuro vendido sem exigir cotação B3 para o cenário didático", () => {
    render(<CommodityStrategyComparatorCard
      situation={{ economic_situation_id: "sit-gld", exposure_id: "exp-gld", situation_kind: "COMMODITY_SALE", description: "Venda de ouro", declared_quantity: 30, declared_currency: "USD", horizon_date: "2026-12-15", commodity_reference: "GLD", indexer: null, origin: "USER_DECLARED", captured_at_utc: "2026-08-22T00:00:00.000Z" }}
      alternative={{ alternative_id: "alt-gld", exposure_id: "exp-gld", alternative_kind: "B3_COMMODITY_FUTURE", label: "Futuro de Ouro", risk_factor: "B3_COMMODITY_PRICE", hedge_direction: "SELL", eligibility_status: "eligible_with_market_data", required_data: ["série GLD"], blocking_reason: null, source_ids: ["B3_PUBLIC_FILES"], method_version: "hedge-alternatives-v1", economic_situation_id: "sit-gld", risk_factor_id: "risk-gld", origin: "CATALOG_DERIVED" }}
    />);
    expect(screen.getByText(/Venda física: queda de preço reduz a receita/i)).toBeTruthy();
    expect(screen.getByText(/posição vendida em futuro/i)).toBeTruthy();
    expect(screen.getByText(/Hipótese didática, não preço B3/i)).toBeTruthy();
  });
});

// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import ExposureMaturityBucketsCard from "./ExposureMaturityBucketsCard";

describe("ExposureMaturityBucketsCard", () => {
  it("consolida os nocionais declarados por moeda e vencimento", () => {
    const { container } = render(<ExposureMaturityBucketsCard exposures={[
      { exposure_id: "EXP-1", currency: "USD", direction: "RECEIVABLE", notional: 100000, cashflow_date: "2026-10-01" },
      { exposure_id: "EXP-2", currency: "USD", direction: "PAYABLE", notional: 25000, cashflow_date: "2026-10-01" },
      { exposure_id: "EXP-3", currency: "EUR", direction: "PAYABLE", notional: 50000, cashflow_date: "2026-11-01" },
    ]} />);
    expect(screen.getByText("Exposição líquida por vencimento")).toBeTruthy();
    expect(screen.getByText("2026-10-01")).toBeTruthy();
    expect(screen.getByText(/75\.000,00/)).toBeTruthy();
    expect(screen.getByText(/Não calcula valor presente, MTM, risco de juros ou Greeks/i)).toBeTruthy();
    expect(container.querySelector(".overflow-x-auto")).toBeTruthy();
    expect(container.querySelector("table")?.className).toContain("min-w-[620px]");
    expect(container.querySelector("tbody")?.className).toContain("text-[#294a50]");
    expect(screen.getByText("Vencimento").closest("thead")?.className).toContain("text-[#456970]");
  });

  it("nunca soma quantidade física de commodity como valor monetário e mostra a posição em uma tabela separada", () => {
    const { container } = render(<ExposureMaturityBucketsCard exposures={[
      { exposure_id: "EXP-1", currency: "USD", direction: "RECEIVABLE", notional: 100000, cashflow_date: "2026-10-01" },
      { exposure_id: "EXP-4", currency: "BRL", direction: "PAYABLE", notional: 0, cashflow_date: "2026-09-24", exposureClass: "PHYSICAL_COMMODITY", physicalQuantity: 1000, physicalUnit: "SACA_60KG", commodityReference: "CCM" },
    ]} />);
    // A quantidade física (1.000) não pode aparecer como "R$ 1.000,00" na tabela de fluxos monetários.
    expect(container.textContent).not.toMatch(/R\$\s*1\.000,00/);
    expect(within(container).getByText("Posições físicas de commodity por vencimento")).toBeTruthy();
    expect(within(container).getByText("CCM")).toBeTruthy();
    expect(within(container).getByText("SACA_60KG")).toBeTruthy();
    expect(within(container).getByText("1.000")).toBeTruthy();
  });
});

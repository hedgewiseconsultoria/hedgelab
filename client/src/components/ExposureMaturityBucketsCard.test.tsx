// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
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
});

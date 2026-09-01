// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import B3DiCurveEvidenceChart from "./B3DiCurveEvidenceChart";

vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
afterEach(() => cleanup());

describe("B3DiCurveEvidenceChart", () => {
  it("não exibe gráfico sem vértices oficiais", () => {
    const { container } = render(<B3DiCurveEvidenceChart curve={null} />);
    expect(container.textContent).toBe("");
  });

  it("identifica a data-base e a natureza observada da curva B3", () => {
    render(<B3DiCurveEvidenceChart curve={{
      asof: "2026-08-20", status: "valid_market_vertices", dataframe: [{ curve_point_id: "di1-jan", symbol: "DI1F27", maturity: "2027-01-01", adjusted_rate_pct_aa252: 14.25, business_days_to_maturity: 90, source_file: "PR260820.xml", source_hash_sha256: "a".repeat(64) }], issues: [], csv: { storageUrl: "", manifestUrl: "" },
    } as any} />);
    expect(screen.getByText(/Vértices DI1 publicados — 2026-08-20/)).toBeTruthy();
    expect(screen.getByText(/não há interpolação, taxa forward, projeção ou preço substituto/i)).toBeTruthy();
  });
});

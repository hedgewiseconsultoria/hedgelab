// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/trpc", () => ({ trpc: { marketData: { b3RealSnapshot: { useQuery: vi.fn(() => ({ isLoading: false, data: { asOf: "2026-08-17", association: { status: "valid", priceAsOf: "2026-08-17", instrumentReportAsOf: "2026-08-17", message: "ok" }, files: [], columns: [], limitation: "Somente inspeção", coverage086: ["DOL", "WDO", "DI1", "BGI", "CCM", "SOY", "SJC", "ICF"].map(family => ({ family, records: 1, futureRecords: 1, optionRecords: family === "DOL" || ["BGI", "CCM", "SOY", "SJC"].includes(family) ? 1 : 0, recordsWithTradePrice: 1, recordsWithAdjustedQuote: 1 })) } })) } } } }));
import B3RealPipelineCard from "./B3RealPipelineCard";

describe("B3RealPipelineCard", () => {
  it("inclui as famílias empresariais prioritárias sem adicionar ICF não solicitado", () => {
    render(<B3RealPipelineCard />);
    ["DOL", "WDO", "DI1", "BGI", "CCM", "SOY", "SJC"].forEach(family => expect(screen.getByText(family)).toBeTruthy());
    expect(screen.queryByText("ICF")).toBeNull();
  });
});

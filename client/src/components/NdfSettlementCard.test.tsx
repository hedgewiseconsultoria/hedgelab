// @vitest-environment jsdom
import { render, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ndfScenario: vi.fn(() => ({ data: { grossSettlementBrl: 10_000, presentValueBrl: 9_950, settlementDate: "2026-08-18", limitations: ["MTM bloqueado sem curva estrangeira."], lineage: { ptaxLineage: { sourceAsOf: "2026-08-13" }, ettjLineage: { sourceAsOf: "2026-08-13" } } }, isLoading: false })),
}));

vi.mock("@/lib/trpc", () => ({ trpc: { hedge: { ndfSettlementScenario: { useQuery: mocks.ndfScenario } } } }));

import NdfSettlementCard from "./NdfSettlementCard";

describe("NdfSettlementCard", () => {
  it("publica somente o cenário NDF válido, com resultado, limitações e linhagem já exigida pelo módulo", async () => {
    const onSessionSnapshot = vi.fn();
    render(<NdfSettlementCard ptaxSale={5.25} ptaxLineage={{ sourceAsOf: "2026-08-13", sourceHashSha256: "a".repeat(64) }} ettjLineage={{ sourceAsOf: "2026-08-13", sourceHashSha256: "b".repeat(64) }} onSessionSnapshot={onSessionSnapshot} />);

    await waitFor(() => {
      expect(onSessionSnapshot).toHaveBeenLastCalledWith(expect.objectContaining({
        scenario: expect.objectContaining({ scenario_id: expect.stringContaining("ndf-") }),
        calculations: [expect.objectContaining({ method: "NDF_SETTLEMENT_PV", result: expect.objectContaining({ present_value_brl: 9_950 }), warnings: ["MTM bloqueado sem curva estrangeira."] })],
      }));
    });
  });
});

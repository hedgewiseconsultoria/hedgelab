// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ useQuery: vi.fn() }));
vi.mock("@/lib/trpc", () => ({ trpc: { marketData: { readB3NormalizedObservations: { useQuery: mocks.useQuery } } } }));

import B3ObservationSelector from "./B3ObservationSelector";

afterEach(() => cleanup());

describe("B3ObservationSelector", () => {
  it("publica somente a série B3 selecionada pelo usuário e preserva as evidências de preço e cadastro", () => {
    mocks.useQuery.mockReturnValue({ isFetching: false, isError: false, data: {
      candidates: [{ instrumentId: "ID-DOL", symbol: "DOLU26", family: "DOL", instrumentType: "FUTURE", maturity: "2026-09-01", optionType: null, exercisePrice: null, lastPrice: 5.4, tradeAveragePrice: null, adjustedQuote: 5.39, adjustedQuoteTax: null, sourceFile: "BVBG.086.01.xml", sourceHashSha256: "a".repeat(64) }],
      priceSource: { reportType: "BVBG.086.01", sourceUrl: "https://www.b3.com.br/pesquisapregao/download", sourceFile: "BVBG.086.01.xml", sourceAsOf: "2026-08-17", sourceHashSha256: "a".repeat(64), normalizedCsvStorageKey: "b3/normalized/price.csv", normalizedCsvSha256: "c".repeat(64), normalizedManifestStorageKey: "b3/normalized/price.manifest.json" },
      instrumentSource: { sourceUrl: "https://www.b3.com.br/pesquisapregao/download", sourceFile: "BVBG.028.02.xml", sourceAsOf: "2026-08-17", sourceHashSha256: "b".repeat(64), normalizedCsvStorageKey: "b3/normalized/instrument.csv", normalizedCsvSha256: "d".repeat(64), normalizedManifestStorageKey: "b3/normalized/instrument.manifest.json" },
    } });
    const onSelected = vi.fn();
    render(<B3ObservationSelector
      artifacts={[
        { report_type: "BVBG.086.01", source_asof: "2026-08-17", source_file: "BVBG.086.01.xml", validation_status: "valid", csv: { storage_key: "b3/normalized/price.csv", storage_url: "/manus-storage/price", sha256: "c".repeat(64) }, manifest: { storage_key: "b3/normalized/price.manifest.json", storage_url: "/manus-storage/price-manifest" } },
        { report_type: "BVBG.028.02", source_asof: "2026-08-17", source_file: "BVBG.028.02.xml", validation_status: "valid", csv: { storage_key: "b3/normalized/instrument.csv", storage_url: "/manus-storage/instrument", sha256: "d".repeat(64) }, manifest: { storage_key: "b3/normalized/instrument.manifest.json", storage_url: "/manus-storage/instrument-manifest" } },
      ]}
      dataframes={{ economic_situation_dataframe: [], risk_factor_dataframe: [], hedge_sizing_dataframe: [], scenario_result_dataframe: [], b3_observation_link_dataframe: [], hedge_alternative_dataframe: [{ alternative_id: "alt-dol", exposure_id: "exp", alternative_kind: "B3_DOL_FUTURE", label: "Futuro DOL", risk_factor: "USD_BRL", hedge_direction: "BUY", eligibility_status: "eligible_with_market_data", required_data: [], blocking_reason: null, source_ids: ["B3_PUBLIC_FILES"], method_version: "hedge-alternatives-v1", economic_situation_id: "sit", risk_factor_id: "risk", origin: "CATALOG_DERIVED" }] }}
      onSelected={onSelected}
    />);
    fireEvent.change(screen.getByLabelText("Alternativa B3"), { target: { value: "alt-dol" } });
    fireEvent.click(screen.getByRole("button", { name: "Vincular" }));
    expect(onSelected).toHaveBeenCalledWith(expect.objectContaining({ alternativeId: "alt-dol", candidate: expect.objectContaining({ symbol: "DOLU26", maturity: "2026-09-01" }), priceSource: expect.objectContaining({ sourceHashSha256: "a".repeat(64) }), instrumentSource: expect.objectContaining({ sourceHashSha256: "b".repeat(64) }) }));
  });
});

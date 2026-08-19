// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createParquetScenarioArtifact, readParquetScenarioArtifact } from "../../../server/domain/parquetArtifact";
import { createScenarioBundle } from "../../../server/domain/scenarioBundle";
import { createExposureCsvArtifact } from "../lib/exposureCsvArtifact";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);

const mocks = vi.hoisted(() => ({
  createMutate: vi.fn(),
  exportOptions: null as { onSuccess?: (artifact: any) => void } | null,
  exportMutate: vi.fn(),
  importOptions: null as { onSuccess?: (bundle: any) => void } | null,
  importMutate: vi.fn(),
  jsonImportOptions: null as { onSuccess?: (bundle: any) => void } | null,
  jsonImportMutate: vi.fn(),
  ptaxQuery: { data: undefined as any, isError: false, isFetching: false, refetch: vi.fn() },
}));

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
const snapshot = (scenarioId: string, method: string) => ({
  scenario: { scenario_id: scenarioId, scenario_name: scenarioId, fx_shock_pct: null, rate_shock_bps: null, volatility_shock_pct: null, created_at_utc: "2026-08-17T00:00:00.000Z" },
  calculations: [{ calculation_id: `${scenarioId}-calculation`, scenario_id: scenarioId, method, formula_version: "1.0.0", calculation_status: "SUCCESS", result: method === "RESIDUAL_PARAMETRIC_VAR" ? { residual_var_brl: 1250, coverage_pct: 0.8 } : {}, warnings: [], calculated_at_utc: "2026-08-17T00:00:00.000Z" }],
});

vi.mock("sonner", () => ({ toast }));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    marketData: {
      ptaxUsdDay: { useQuery: () => mocks.ptaxQuery },
      ipcaMonthly: { useQuery: () => ({ data: undefined }) },
      anbimaEttj: { useQuery: () => ({ data: undefined }) },
      igpmPublishedTable: { useQuery: () => ({ data: undefined, isFetching: false, refetch: vi.fn() }) },
    },
    workspace: {
      createScenarioBundle: { useMutation: (options: any) => ({ mutate: (variables: any) => {
        mocks.createMutate(variables);
        const scenarioId = variables.dataframes.scenario_dataframe[0]?.scenario_id ?? "sessao";
        options.onSuccess?.({ bundle_id: `bundle-${scenarioId}`, bundle_sha256: scenarioId.padEnd(64, "0").slice(0, 64), exported_at_utc: variables.exported_at_utc, dataframes: variables.dataframes }, variables);
      }, isPending: false }) },
      exportParquetScenario: { useMutation: (options: any) => { mocks.exportOptions = options; return { mutate: mocks.exportMutate, isPending: false }; } },
      importParquetScenario: { useMutation: (options: any) => { mocks.importOptions = options; return { mutate: mocks.importMutate, isPending: false }; } },
      importScenarioBundle: { useMutation: (options: any) => { mocks.jsonImportOptions = options; return { mutate: mocks.jsonImportMutate, isPending: false }; } },
    },
  },
}));

vi.mock("./FxFutureSizer", () => ({ default: ({ onSizing }: any) => <button onClick={() => onSizing({ exposureId: "exp-1", contract: "DOL", roundingPolicy: "CEILING", contracts: 3, coverageRatio: 1.25 })}>Publicar cobertura DOL</button> }));
vi.mock("./FxOptionSizer", () => ({ default: () => null }));
vi.mock("./CommodityFutureSizer", () => ({ default: () => null }));
vi.mock("./CommodityOptionSizer", () => ({ default: () => null }));
vi.mock("./FxScenarioLab", () => ({ default: ({ onSessionSnapshot }: any) => <button onClick={() => onSessionSnapshot(snapshot("fx-history", "FX_STRESS_PTAX"))}>Emitir snapshot FX</button> }));
vi.mock("./ScenarioBundleComparator", () => ({ default: () => null }));
vi.mock("./B3RealPipelineCard", () => ({ default: () => null }));
vi.mock("./B3InstrumentMasterSelector", () => ({ default: ({ onSelected }: any) => <button onClick={() => onSelected({ instrument_id: "B3_PRODUCT_SPEC::DOL", instrument_key: "DOL", product_kind: "B3_FX_FUTURE", description: "Contrato Futuro de Dólar", terms: {}, source: "B3_PRODUCT_SPECIFICATION", evidence_source_file: "especificacao-dol", evidence_source_url: "https://www.b3.com.br/", evidence_sha256: "a".repeat(64), evidence_captured_at_utc: "2026-08-17T00:00:00.000Z", validation_status: "official_specification_loaded", series_status: "no_b3_series_selected" })}>Adicionar especificação B3</button> }));
vi.mock("./B3ManualCollectionCard", () => ({ default: () => null }));
vi.mock("./B3ObservationSelector", () => ({ default: () => null }));
vi.mock("./B3FxFutureDailySettlementCard", () => ({ default: () => null }));
vi.mock("./B3DollarOptionIntrinsicSettlementCard", () => ({ default: () => null }));
vi.mock("./B3CornOptionIntrinsicSettlementCard", () => ({ default: () => null }));
vi.mock("./B3CattleOptionIntrinsicSettlementCard", () => ({ default: () => null }));
vi.mock("./B3SoyOptionIntrinsicSettlementCard", () => ({ default: () => null }));
vi.mock("./B3SjcOptionIntrinsicSettlementCard", () => ({ default: () => null }));
vi.mock("./B3DiFutureCurveCard", () => ({ default: () => null }));
vi.mock("./OfficialManualCollectionCard", () => ({ default: () => null }));
vi.mock("./BcbSelicSgsCard", () => ({ default: () => null }));
vi.mock("./BcbSelicAnnualized252Card", () => ({ default: () => null }));
vi.mock("./IpcaAccumulationCard", () => ({ default: () => null }));
vi.mock("./SelicOverAccumulationCard", () => ({ default: () => null }));
vi.mock("./ExposureMaturityBucketsCard", () => ({ default: () => null }));
vi.mock("./HedgeDiagnosisCard", () => ({ default: ({ onCanonicalDataframes }: any) => <button onClick={() => onCanonicalDataframes({ economic_situation_dataframe: [{ economic_situation_id: "sit-1", exposure_id: "exp-1", situation_kind: "USD_PAYABLE", description: "Importação", declared_quantity: 100_000, declared_currency: "USD", horizon_date: "2026-12-15", commodity_reference: null, indexer: null, origin: "USER_DECLARED", captured_at_utc: "2026-08-18T00:00:00.000Z" }], risk_factor_dataframe: [{ risk_factor_id: "risk-1", economic_situation_id: "sit-1", risk_factor: "USD_BRL", adverse_move: "alta", economic_impact: "custo", hedge_direction: "BUY", method_version: "economic-exposure-diagnosis-v1" }], hedge_alternative_dataframe: [{ alternative_id: "alt-dol", exposure_id: "exp-1", alternative_kind: "B3_DOL_FUTURE", label: "DOL", risk_factor: "USD_BRL", hedge_direction: "BUY", eligibility_status: "eligible_with_market_data", required_data: [], blocking_reason: null, source_ids: ["B3_PUBLIC_FILES"], method_version: "hedge-alternatives-v1", economic_situation_id: "sit-1", risk_factor_id: "risk-1", origin: "CATALOG_DERIVED" }], hedge_sizing_dataframe: [], scenario_result_dataframe: [] })}>Publicar diagnóstico canônico</button> }));
vi.mock("./LinearFuturesScenarioCard", () => ({ default: () => null }));
vi.mock("./Di1VariationMarginCard", () => ({ default: () => null }));
vi.mock("./CurrentScenarioComparisonCard", () => ({ default: () => null }));
vi.mock("./BusinessDayCalculatorCard", () => ({ default: () => null }));
vi.mock("./NdfSettlementCard", () => ({ default: ({ onSessionSnapshot }: any) => <button onClick={() => onSessionSnapshot(snapshot("ndf-history", "NDF_SETTLEMENT_PV"))}>Emitir snapshot NDF</button> }));
vi.mock("./FxSwapScenarioCard", () => ({ default: () => null }));
vi.mock("./OtcContractMasterCard", () => ({ default: ({ onMasterCreated, onHedgeCreated, exposures }: any) => <><button onClick={() => onMasterCreated({ instrument_id: "OTC-NDF-ROUNDTRIP", kind: "OTC_NDF", base_currency: "USD", quote_currency: "BRL", notional_base_currency: 100000, trade_date: "2026-08-17", maturity: "2026-10-01", settlement_convention: "D+1", terms: {}, source: "USER_CONTRACT", evidence_source_file: "contrato-ndf.pdf", evidence_source_url: null, evidence_sha256: "a".repeat(64), evidence_captured_at_utc: "2026-08-17T00:00:00.000Z", validation_status: "validated_user_contract" })}>Adicionar master OTC</button><button onClick={() => onHedgeCreated({ hedge_id: "HEDGE-ROUNDTRIP", exposure_id: exposures[0]?.exposure_id ?? "", instrument_id: "OTC-NDF-ROUNDTRIP", strategy: "NDF_HEDGE", quantity: 1, trade_date: "2026-08-17", maturity: "2026-10-01", method_version: "1.0.0" })}>Adicionar hedge vinculado</button></> }));
vi.mock("./HedgeEffectivenessCard", () => ({ default: ({ onSessionSnapshot }: any) => <button onClick={() => onSessionSnapshot(snapshot("effectiveness-history", "HEDGE_EFFECTIVENESS_SCREENING"))}>Emitir snapshot efetividade</button> }));
vi.mock("./ResidualRiskCard", () => ({ default: ({ onSessionSnapshot }: any) => <button onClick={() => onSessionSnapshot(snapshot("residual-history", "RESIDUAL_PARAMETRIC_VAR"))}>Emitir snapshot risco residual</button> }));

import HedgeDashboard from "./HedgeDashboard";

afterEach(() => {
  cleanup();
  localStorage.clear();
  mocks.ptaxQuery.data = undefined;
  mocks.ptaxQuery.isError = false;
  mocks.ptaxQuery.isFetching = false;
  mocks.ptaxQuery.refetch.mockReset();
  vi.unstubAllGlobals();
  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
});

describe("HedgeDashboard", () => {
  it("apresenta o cabeçalho de sessão em português e anuncia métricas dinamicamente", () => {
    render(<HedgeDashboard />);

    expect(screen.getByText("SESSÃO / AUDITÁVEL")).toBeTruthy();
    expect(screen.queryByText("SESSION / LOCAL")).toBeNull();
    expect(screen.getByText("Evidência antes da decisão de hedge.")).toBeTruthy();
    expect(document.querySelector('[aria-live="polite"][aria-atomic="true"]')).toBeTruthy();
  });

  it("apresenta indisponibilidade PTAX orientativa sem a mensagem técnica de consulta", () => {
    mocks.ptaxQuery.data = {
      dataframe: [],
      availabilityStatus: "unavailable",
      availabilityMessage: "O BCB não publicou cotação PTAX para a data-base informada.",
      lineage: { sourceId: "BCB_PTAX", sourceUrl: "https://olinda.bcb.gov.br/", sourceFile: "CotacaoDolarDia", extractedAtUtc: "2026-08-19T12:00:00.000Z", sourceAsOf: "2026-08-19", sourceHashSha256: "a".repeat(64), parserVersion: "bcb-ptax-odata-v1", validationStatus: "warning" },
    };
    render(<HedgeDashboard />);

    expect(screen.getByText(/O BCB não publicou cotação para a data-base/i)).toBeTruthy();
    expect(screen.getByText("Cotação não publicada para a data-base")).toBeTruthy();
    expect(screen.queryByText(/A fonte oficial PTAX não retornou cotação/i)).toBeNull();
  });

  it("mantém os controles de exportação e importação alcançáveis por teclado", () => {
    render(<HedgeDashboard />);

    const exportButton = screen.getByRole("button", { name: "Exportar pacote" });
    const importButton = screen.getByRole("button", { name: "Importar JSON" });
    exportButton.focus();

    expect(document.activeElement).toBe(exportButton);
    expect(exportButton.className).toContain("focus-visible");
    expect(importButton.tagName).toBe("BUTTON");
    expect(importButton.hasAttribute("disabled")).toBe(false);
  });

  it("inclui os DataFrames canônicos do diagnóstico no pacote exportado", () => {
    mocks.createMutate.mockClear();
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:hedge-lab"), revokeObjectURL: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(<HedgeDashboard />);
    fireEvent.click(screen.getByRole("button", { name: "Publicar diagnóstico canônico" }));
    fireEvent.click(screen.getByRole("button", { name: "Exportar pacote" }));
    expect(mocks.createMutate).toHaveBeenCalledWith(expect.objectContaining({ dataframes: expect.objectContaining({ economic_situation_dataframe: [expect.objectContaining({ economic_situation_id: "sit-1" })], risk_factor_dataframe: [expect.objectContaining({ risk_factor: "USD_BRL" })] }) }));
  });

  it("publica a cobertura DOL canônica e a inclui no pacote exportado", () => {
    mocks.createMutate.mockClear();
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:hedge-lab"), revokeObjectURL: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(<HedgeDashboard />);
    fireEvent.click(screen.getByRole("button", { name: "Publicar diagnóstico canônico" }));
    fireEvent.click(screen.getByRole("button", { name: "Adicionar especificação B3" }));
    fireEvent.click(screen.getByRole("button", { name: "Publicar cobertura DOL" }));
    fireEvent.click(screen.getByRole("button", { name: "Exportar pacote" }));
    expect(mocks.createMutate).toHaveBeenCalledWith(expect.objectContaining({ dataframes: expect.objectContaining({ hedge_sizing_dataframe: [expect.objectContaining({ alternative_id: "alt-dol", sizing_status: "sized", coverage_target_pct: 100, hedge_quantity: 3 })] }) }));
  });

  it("restaura exposição, Instrument Master, hedge, cenário e cálculos após importar o par Parquet e manifesto", async () => {
    mocks.importMutate.mockClear();
    mocks.importOptions = null;
    const { container } = render(<HedgeDashboard />);

    fireEvent.click(screen.getByRole("button", { name: "Importar Parquet" }));
    const fileInput = container.querySelector('input[multiple]')!;
    const parquet = new File(["parquet"], "sessao.parquet", { type: "application/vnd.apache.parquet" });
    const manifest = new File([JSON.stringify({ sha256: "a".repeat(64) })], "sessao.parquet.manifest.json", { type: "application/json" });
    fireEvent.change(fileInput, { target: { files: [parquet, manifest] } });

    await waitFor(() => expect(mocks.importMutate).toHaveBeenCalledWith({ bytesBase64: "cGFycXVldA==", manifest: { sha256: "a".repeat(64) } }));
    act(() => mocks.importOptions?.onSuccess?.({
      dataframes: {
        exposure_dataframe: [{ exposure_id: "EXP-1", description: "Importação", currency: "USD", direction: "PAYABLE", notional: 100000, cashflow_date: "2026-10-01", created_at_utc: "2026-08-17T00:00:00.000Z" }],
        instrument_master_dataframe: [{ instrument_id: "OTC-NDF-1" }],
        hedge_dataframe: [{ hedge_id: "HEDGE-1" }],
        scenario_dataframe: [{ scenario_id: "SCN-1" }],
        calculation_dataframe: [{ calculation_id: "CALC-1" }],
        lineage_dataframe: [{ source_id: "SRC-1" }],
      },
    }));

    await waitFor(() => {
      expect(screen.getByText("Importação")).toBeTruthy();
      expect(screen.getByTestId("session-dataframe-counts").textContent).toContain("1 instrumentos · 1 hedges · 1 cenários · 1 cálculos");
      expect(screen.getByTestId("restored-instrument-master-panel").textContent).toContain("OTC-NDF-1");
      expect(screen.getByTestId("restored-hedge-panel").textContent).toContain("HEDGE-1");
      expect(screen.getByTestId("restored-scenario-panel").textContent).toContain("SCN-1");
      expect(screen.getByTestId("restored-calculation-panel").textContent).toContain("CALC-1");
    });
  });

  it("rejeita um par Parquet incompleto antes de chamar a mutação de importação", async () => {
    mocks.importMutate.mockClear();
    toast.error.mockClear();
    const { container } = render(<HedgeDashboard />);

    fireEvent.click(screen.getByRole("button", { name: "Importar Parquet" }));
    const fileInput = container.querySelector('input[multiple]')!;
    const parquet = new File(["parquet"], "sessao.parquet", { type: "application/vnd.apache.parquet" });
    fireEvent.change(fileInput, { target: { files: [parquet] } });

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Selecione, juntos, o arquivo .parquet e o respectivo .parquet.manifest.json."));
    expect(mocks.importMutate).not.toHaveBeenCalled();
  });

  it("restaura a sessão por um pacote JSON somente após a validação de integridade", async () => {
    mocks.jsonImportMutate.mockClear();
    const bundle = createScenarioBundle({
      bundleId: "bundle-json",
      exportedAtUtc: "2026-08-17T00:00:00.000Z",
      dataframes: {
        instrument_master_dataframe: [],
        exposure_dataframe: [{ exposure_id: "EXP-JSON", description: "Exposição JSON", currency: "USD", direction: "PAYABLE", notional: 50000, cashflow_date: "2026-10-01", created_at_utc: "2026-08-17T00:00:00.000Z" }],
        hedge_dataframe: [],
        scenario_dataframe: [],
        calculation_dataframe: [],
        lineage_dataframe: [],
      },
    });
    const { container } = render(<HedgeDashboard />);

    fireEvent.click(screen.getByRole("button", { name: "Importar JSON" }));
    const jsonInput = container.querySelector('input[accept="application/json,.json"]')!;
    fireEvent.change(jsonInput, { target: { files: [new File([JSON.stringify(bundle)], "sessao.json", { type: "application/json" })] } });

    await waitFor(() => expect(mocks.jsonImportMutate).toHaveBeenCalledWith({ serializedBundle: JSON.stringify(bundle) }));
    act(() => mocks.jsonImportOptions?.onSuccess?.(bundle));
    await waitFor(() => expect(screen.getByText("Exposição JSON")).toBeTruthy());
  });

  it("restaura o DataFrame de exposições pelo par CSV e manifesto com hash válido", async () => {
    const artifact = await createExposureCsvArtifact([{ exposure_id: "EXP-CSV", description: "Exposição CSV", currency: "USD", direction: "PAYABLE", notional: 75000, cashflow_date: "2026-10-01", created_at_utc: "2026-08-17T00:00:00.000Z" }], []);
    const { container } = render(<HedgeDashboard />);
    fireEvent.click(screen.getByRole("button", { name: "Importar CSV" }));
    const csvInput = container.querySelector('input[accept=".csv,.json,text/csv,application/json"]')!;
    fireEvent.change(csvInput, { target: { files: [new File([artifact.csv], "exposicoes.csv", { type: "text/csv" }), new File([JSON.stringify(artifact.manifest)], "exposicoes.csv.manifest.json", { type: "application/json" })] } });
    await waitFor(() => expect(screen.getByText("Exposição CSV")).toBeTruthy());
  });

  it("rejeita CSV sem o manifesto correspondente antes de alterar as exposições", async () => {
    toast.error.mockClear();
    const { container } = render(<HedgeDashboard />);
    fireEvent.click(screen.getByRole("button", { name: "Importar CSV" }));
    const csvInput = container.querySelector('input[accept=".csv,.json,text/csv,application/json"]')!;
    fireEvent.change(csvInput, { target: { files: [new File(["exposure_id\nEXP-1"], "exposicoes.csv", { type: "text/csv" })] } });
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Selecione, juntos, o arquivo .csv e o respectivo .csv.manifest.json."));
    expect(screen.getByText("Nenhuma exposição adicionada")).toBeTruthy();
  });

  it("exporta pela interface o arquivo Parquet e seu manifesto de integridade", () => {
    mocks.exportMutate.mockClear();
    const downloads: string[] = [];
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) { downloads.push(this.download); });
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:hedge-lab"), revokeObjectURL: vi.fn() });

    render(<HedgeDashboard />);
    fireEvent.click(screen.getByRole("button", { name: "Parquet + manifesto" }));
    expect(mocks.exportMutate).toHaveBeenCalledWith(expect.objectContaining({ bundle_schema_version: "1.0.0" }));

    act(() => mocks.exportOptions?.onSuccess?.({ bytesBase64: "AQID", manifest: { sha256: "a".repeat(64) } }));
    expect(downloads).toEqual([
      "hedge-lab-sessao-aaaaaaaaaaaa.parquet",
      "hedge-lab-sessao-aaaaaaaaaaaa.parquet.manifest.json",
    ]);
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
    click.mockRestore();
    vi.unstubAllGlobals();
  });

  it("exporta e reimporta o mesmo par Parquet real, restaurando a sessão no mesmo fluxo", async () => {
    mocks.exportMutate.mockClear();
    mocks.importMutate.mockClear();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:hedge-lab"), revokeObjectURL: vi.fn() });

    const { container } = render(<HedgeDashboard />);
    fireEvent.change(screen.getByLabelText("Descrição"), { target: { value: "Exposição round-trip" } });
    fireEvent.change(screen.getByLabelText("Valor nocional"), { target: { value: "100000" } });
    fireEvent.change(screen.getByLabelText("Data do fluxo"), { target: { value: "2026-10-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar exposição" }));
    await screen.findByText("Exposição round-trip");
    fireEvent.click(screen.getByRole("button", { name: "Adicionar master OTC" }));
    fireEvent.click(screen.getByRole("button", { name: "Adicionar hedge vinculado" }));
    fireEvent.click(screen.getByRole("button", { name: "Emitir snapshot NDF" }));
    await waitFor(() => expect(screen.getByTestId("session-dataframe-counts").textContent).toContain("1 instrumentos · 1 hedges · 1 cenários · 1 cálculos"));

    fireEvent.click(screen.getByRole("button", { name: "Parquet + manifesto" }));
    const exportRequest = mocks.exportMutate.mock.calls.at(-1)?.[0];
    expect(exportRequest).toBeTruthy();
    const artifact = await createParquetScenarioArtifact({
      bundleId: exportRequest.bundle_id,
      exportedAtUtc: exportRequest.exported_at_utc,
      dataframes: exportRequest.dataframes,
    });
    act(() => mocks.exportOptions?.onSuccess?.({ bytesBase64: artifact.bytes.toString("base64"), manifest: artifact.manifest }));

    fireEvent.click(screen.getByRole("button", { name: "Importar Parquet" }));
    const fileInput = container.querySelector('input[multiple]')!;
    const parquet = new File([Uint8Array.from(artifact.bytes)], "sessao.parquet", { type: "application/vnd.apache.parquet" });
    const manifest = new File([JSON.stringify(artifact.manifest)], "sessao.parquet.manifest.json", { type: "application/json" });
    fireEvent.change(fileInput, { target: { files: [parquet, manifest] } });

    await waitFor(() => expect(mocks.importMutate).toHaveBeenCalledWith({ bytesBase64: artifact.bytes.toString("base64"), manifest: artifact.manifest }));
    const importRequest = mocks.importMutate.mock.calls.at(-1)?.[0];
    const restored = await readParquetScenarioArtifact(Buffer.from(importRequest.bytesBase64, "base64"), importRequest.manifest);
    act(() => mocks.importOptions?.onSuccess?.(restored));

    await waitFor(() => {
      expect(screen.getByText("Exposição round-trip")).toBeTruthy();
      expect(screen.getByTestId("restored-instrument-master-panel").textContent).toContain("OTC-NDF-ROUNDTRIP");
      expect(screen.getByTestId("restored-hedge-panel").textContent).toContain("HEDGE-ROUNDTRIP");
      expect(screen.getByTestId("restored-scenario-panel").textContent).toContain("ndf-history");
      expect(screen.getByTestId("restored-calculation-panel").textContent).toContain("ndf-history-calculation");
    });
    click.mockRestore();
    vi.unstubAllGlobals();
  });

  it("registra no histórico local todos os snapshots de simulações executadas na sessão", async () => {
    mocks.createMutate.mockClear();
    render(<HedgeDashboard />);

    fireEvent.click(screen.getByRole("button", { name: "Emitir snapshot FX" }));
    fireEvent.click(screen.getByRole("button", { name: "Emitir snapshot NDF" }));
    fireEvent.click(screen.getByRole("button", { name: "Emitir snapshot efetividade" }));
    fireEvent.click(screen.getByRole("button", { name: "Emitir snapshot risco residual" }));

    await waitFor(() => {
      expect(mocks.createMutate).toHaveBeenCalledTimes(4);
      expect(screen.getByText("4/20 versões")).toBeTruthy();
      expect(screen.getByText(/1\.250,00/)).toBeTruthy();
    });
    const persisted = JSON.parse(localStorage.getItem("hedge-lab.simulation-history.v1.perfil-local") ?? "[]");
    expect(persisted.map((item: { scenario_id: string }) => item.scenario_id)).toEqual(expect.arrayContaining(["fx-history", "ndf-history", "effectiveness-history", "residual-history"]));
  });

  it("não atualiza a sessão nem cria versão duplicada quando o módulo republica o mesmo snapshot", async () => {
    mocks.createMutate.mockClear();
    render(<HedgeDashboard />);

    fireEvent.click(screen.getByRole("button", { name: "Emitir snapshot NDF" }));
    fireEvent.click(screen.getByRole("button", { name: "Emitir snapshot NDF" }));

    await waitFor(() => expect(mocks.createMutate).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("session-dataframe-counts").textContent).toContain("0 instrumentos · 0 hedges · 1 cenários · 1 cálculos");
    expect(screen.getByText("1/20 versões")).toBeTruthy();
  });
});

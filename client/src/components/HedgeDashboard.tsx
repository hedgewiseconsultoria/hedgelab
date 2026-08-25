import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import FxFutureSizer from "@/components/FxFutureSizer";
import FxOptionSizer from "@/components/FxOptionSizer";
import CommodityFutureSizer from "@/components/CommodityFutureSizer";
import CommodityOptionSizer from "@/components/CommodityOptionSizer";
import FxScenarioLab, { type FxScenarioSessionSnapshot } from "@/components/FxScenarioLab";
import ScenarioBundleComparator from "@/components/ScenarioBundleComparator";
import B3RealPipelineCard from "@/components/B3RealPipelineCard";
import B3InstrumentMasterSelector, { type B3ProductSpecificationSessionRow } from "@/components/B3InstrumentMasterSelector";
import B3ManualCollectionCard, { type B3ManualLineageRow, type B3NormalizedArtifact } from "@/components/B3ManualCollectionCard";
import B3ObservationSelector from "@/components/B3ObservationSelector";
import B3DiFutureCurveCard from "@/components/B3DiFutureCurveCard";
import B3DiCurveEvidenceChart from "@/components/B3DiCurveEvidenceChart";
import CdiDebtStressScenarioCard from "@/components/CdiDebtStressScenarioCard";
import DiCurveReferenceStatusCard from "@/components/DiCurveReferenceStatusCard";
import Di1OptionContractReferenceCard from "@/components/Di1OptionContractReferenceCard";
import FraDi1StructureReferenceCard from "@/components/FraDi1StructureReferenceCard";
import OfficialManualCollectionCard from "@/components/OfficialManualCollectionCard";
import BusinessDayCalculatorCard from "@/components/BusinessDayCalculatorCard";
import NdfSettlementCard, { type NdfSessionSnapshot } from "@/components/NdfSettlementCard";
import FxSwapScenarioCard from "@/components/FxSwapScenarioCard";
import OtcContractMasterCard, { type OtcHedgeSessionRow, type OtcSessionInstrumentMasterRow } from "@/components/OtcContractMasterCard";
import BcbSelicSgsCard from "@/components/BcbSelicSgsCard";
import BcbSelicAnnualized252Card from "@/components/BcbSelicAnnualized252Card";
import IpcaAccumulationCard from "@/components/IpcaAccumulationCard";
import SelicOverAccumulationCard from "@/components/SelicOverAccumulationCard";
import ExposureMaturityBucketsCard from "@/components/ExposureMaturityBucketsCard";
import CdiDebtCoverageSummaryCard from "@/components/CdiDebtCoverageSummaryCard";
import ExecutiveFlowOverview from "@/components/ExecutiveFlowOverview";
import ConsultantCommandCenter from "@/components/ConsultantCommandCenter";
import HedgeDiagnosisCard, { type GuidedExposurePublication } from "@/components/HedgeDiagnosisCard";
import LinearFuturesScenarioCard from "@/components/LinearFuturesScenarioCard";
import Di1VariationMarginCard from "@/components/Di1VariationMarginCard";
import B3FxFutureDailySettlementCard from "@/components/B3FxFutureDailySettlementCard";
import B3DollarOptionIntrinsicSettlementCard from "@/components/B3DollarOptionIntrinsicSettlementCard";
import B3DollarOptionPremiumMtmGreeksCard from "@/components/B3DollarOptionPremiumMtmGreeksCard";
import B3CornOptionIntrinsicSettlementCard from "@/components/B3CornOptionIntrinsicSettlementCard";
import B3CornOptionPremiumMtmGreeksCard from "@/components/B3CornOptionPremiumMtmGreeksCard";
import B3CattleOptionIntrinsicSettlementCard from "@/components/B3CattleOptionIntrinsicSettlementCard";
import B3CattleOptionPremiumMtmGreeksCard from "@/components/B3CattleOptionPremiumMtmGreeksCard";
import B3SoyOptionIntrinsicSettlementCard from "@/components/B3SoyOptionIntrinsicSettlementCard";
import B3SoyOptionPremiumMtmGreeksCard from "@/components/B3SoyOptionPremiumMtmGreeksCard";
import B3SjcOptionIntrinsicSettlementCard from "@/components/B3SjcOptionIntrinsicSettlementCard";
import B3SjcOptionPremiumMtmGreeksCard from "@/components/B3SjcOptionPremiumMtmGreeksCard";
import CurrentScenarioComparisonCard from "@/components/CurrentScenarioComparisonCard";
import ScenarioStrategyComparisonCard from "@/components/ScenarioStrategyComparisonCard";
import EligibleAlternativesComparisonCard from "@/components/EligibleAlternativesComparisonCard";
import HedgeAlternativeDecisionMatrixCard from "@/components/HedgeAlternativeDecisionMatrixCard";
import CommodityStrategyComparatorCard from "@/components/CommodityStrategyComparatorCard";
import HedgeOperationCard, { commodityMarketFamily, type CommodityMarketLinkObservation, type CommodityMarketLinkStatus } from "@/components/HedgeOperationCard";
import HedgeEffectivenessCard, { type EffectivenessSessionSnapshot } from "@/components/HedgeEffectivenessCard";
import ResidualRiskCard, { type ResidualRiskSessionSnapshot } from "@/components/ResidualRiskCard";
import { downloadAuditPdf } from "@/lib/auditPdf";
import { downloadCsv } from "@/lib/csvDownload";
import { createExposureCsvArtifact, readExposureCsvArtifact, type ExposureCsvManifest } from "@/lib/exposureCsvArtifact";
import { prepareParquetSessionImport } from "@/lib/parquetUpload";
import { appendSimulationHistory, loadSimulationHistory, type LocalSimulationVersion } from "@/lib/simulationHistory";
import { trpc } from "@/lib/trpc";
import { skipToken } from "@tanstack/react-query";
import { selectCompatibleB3Contracts } from "../../../server/domain/b3MarketDataset";
import {
  AlertTriangle,
  ArrowDownToLine,
  CheckCircle2,
  CircleAlert,
  Database,
  FileJson2,
  Landmark,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  WalletCards,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { useLocation } from "wouter";
import type { SessionInstrumentMasterRow } from "../../../server/domain/dataframes";
import type { CanonicalHedgeDataframes } from "../../../server/domain/dataframes";
import { emptyCanonicalHedgeDataframes } from "../../../server/domain/canonicalHedgeDataframes";
import { attachEligibleCanonicalScenarioResults } from "../../../server/domain/canonicalScenarioResults";
import { attachCanonicalFxFutureSizing } from "../../../server/domain/canonicalFxFutureSizing";
import { attachCanonicalFxOptionSizing, type FxOptionSizingPublication } from "../../../server/domain/canonicalFxOptionSizing";
import { attachCanonicalCommodityFutureSizing, type CommodityFutureSizingPublication } from "../../../server/domain/canonicalCommodityFutureSizing";
import { attachCanonicalCommodityOptionSizing, type CommodityOptionSizingPublication } from "../../../server/domain/canonicalCommodityOptionSizing";
import { attachCanonicalNdfSizing } from "../../../server/domain/canonicalNdfSizing";
import { attachCanonicalRateSwapSizing } from "../../../server/domain/canonicalRateSwapSizing";
import { attachCanonicalFxSwapSizing } from "../../../server/domain/canonicalFxSwapSizing";
import { attachCanonicalB3ObservationLink, type B3ObservationSelectionPublication } from "../../../server/domain/canonicalB3ObservationLink";
import type { DiFutureCurveDataset } from "../../../server/domain/diFutureCurve";
import type { CalculationRow, HedgeLabScenarioBundle, HedgeRow, ScenarioRow } from "../../../server/domain/scenarioBundle";
import type { FxFutureSizingSessionPublication } from "@/components/FxFutureSizer";

type Exposure = {
  exposure_id: string;
  description: string;
  currency: string;
  direction: "RECEIVABLE" | "PAYABLE";
  /** Válido como valor monetário apenas quando exposureClass === "FINANCIAL". Para PHYSICAL_COMMODITY, é sempre 0 — use physicalQuantity/physicalUnit. */
  notional: number;
  cashflow_date: string;
  created_at_utc: string;
  /** FINANCIAL: fluxo de caixa em `currency`. PHYSICAL_COMMODITY: posição física declarada, sem valor monetário implícito. */
  exposureClass: "FINANCIAL" | "PHYSICAL_COMMODITY";
  physicalQuantity: number | null;
  physicalUnit: string | null;
  commodityReference: "BGI" | "ICF" | "CNL" | "ETH" | "CCM" | "GLD" | "SOY" | "SJC" | null;
};

type SessionCalculationSnapshot = { scenario: ScenarioRow; calculations: CalculationRow[] };

/** Converte o DataFrame de exposições da sessão (camelCase, em memória) para o schema canônico snake_case validado no servidor/CSV. */
function exposureToRow(exposure: Exposure) {
  return {
    exposure_id: exposure.exposure_id,
    description: exposure.description,
    currency: exposure.currency,
    direction: exposure.direction,
    notional: exposure.notional,
    cashflow_date: exposure.cashflow_date,
    created_at_utc: exposure.created_at_utc,
    exposure_class: exposure.exposureClass,
    physical_quantity: exposure.physicalQuantity,
    physical_unit: exposure.physicalUnit,
    commodity_reference: exposure.commodityReference,
  };
}

function mergeCanonicalDataframes(current: CanonicalHedgeDataframes, incoming: CanonicalHedgeDataframes): CanonicalHedgeDataframes {
  const mergeBy = <T extends Record<string, unknown>>(existing: T[], next: T[], key: keyof T) => [...existing.filter(row => !next.some(candidate => candidate[key] === row[key])), ...next];
  return {
    economic_situation_dataframe: mergeBy(current.economic_situation_dataframe, incoming.economic_situation_dataframe, "economic_situation_id"),
    risk_factor_dataframe: mergeBy(current.risk_factor_dataframe, incoming.risk_factor_dataframe, "risk_factor_id"),
    hedge_alternative_dataframe: mergeBy(current.hedge_alternative_dataframe, incoming.hedge_alternative_dataframe, "alternative_id"),
    hedge_sizing_dataframe: mergeBy(current.hedge_sizing_dataframe, incoming.hedge_sizing_dataframe, "sizing_id"),
    scenario_result_dataframe: mergeBy(current.scenario_result_dataframe, incoming.scenario_result_dataframe, "scenario_result_id"),
    b3_observation_link_dataframe: mergeBy(current.b3_observation_link_dataframe ?? [], incoming.b3_observation_link_dataframe ?? [], "observation_link_id"),
  };
}

const FGV_IGPM_2026 = "https://portal.fgv.br/noticias/igp-m-2026";

export type DashboardPanel = "overview" | "exposures" | "market" | "dataframes" | "scenarios" | "history" | "reports";

export const dashboardPanelByPath: Record<string, DashboardPanel> = {
  "/": "overview",
  "/exposicoes": "exposures",
  "/dados": "market",
  "/dataframes": "dataframes",
  "/cenarios": "scenarios",
  "/historico": "history",
  "/relatorios": "reports",
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function lastWeekday() {
  const value = new Date();
  value.setDate(value.getDate() - 1);
  while (value.getDay() === 0 || value.getDay() === 6) value.setDate(value.getDate() - 1);
  return value.toISOString().slice(0, 10);
}

function latestClosedMonth() {
  const value = new Date();
  value.setMonth(value.getMonth() - 1);
  return `${value.getFullYear()}${String(value.getMonth() + 1).padStart(2, "0")}`;
}

function formatNumber(value: number, digits = 4) {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
}

function totalsByCurrencyFromVersion(version: LocalSimulationVersion | undefined) {
  const candidate = version?.bundle as { dataframes?: { exposure_dataframe?: Array<{ currency?: unknown; notional?: unknown }> } } | undefined;
  const totals = new Map<string, number>();
  for (const row of candidate?.dataframes?.exposure_dataframe ?? []) {
    if (typeof row.currency !== "string" || typeof row.notional !== "number" || !Number.isFinite(row.notional)) continue;
    totals.set(row.currency, (totals.get(row.currency) ?? 0) + row.notional);
  }
  return totals;
}

function Metric({ label, value, detail, tone = "ink" }: { label: string; value: string; detail: string; tone?: "ink" | "mint" | "amber" }) {
  const palette = {
    ink: "border-[#15353d] bg-[#15353d] text-white",
    mint: "border-[#bee8dc] bg-[#e9f8f3] text-[#153f3f]",
    amber: "border-[#f2d8b4] bg-[#fff8ed] text-[#704010]",
  }[tone];
  return <Card className={`overflow-hidden rounded-2xl border shadow-none ${palette}`}><CardContent className="p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] opacity-70">{label}</p><p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p><p className="mt-2 text-xs leading-relaxed opacity-70">{detail}</p></CardContent></Card>;
}

function SourceChip({ label, detail, status, action, spinning }: { label: string; detail: string; status: "loaded" | "pending" | "unavailable" | "error"; action?: () => void; spinning?: boolean }) {
  const tone = { loaded: "border-[#bde5dc] bg-[#effbf7] text-[#0f705b]", pending: "border-[#dde6e7] bg-[#f7f9f9] text-[#6d838b]", unavailable: "border-[#f2d8b4] bg-[#fff8ed] text-[#8d6740]", error: "border-[#f0d5bc] bg-[#fff8ef] text-[#aa5a1c]" }[status];
  const Icon = status === "loaded" ? CheckCircle2 : status === "pending" ? Database : CircleAlert;
  return <div className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 ${tone}`}><Icon className="h-4 w-4 shrink-0" /><div className="min-w-0 flex-1"><p className="text-xs font-semibold">{label}</p><p className="mt-0.5 truncate text-[11px] opacity-80">{detail}</p></div>{action && <button onClick={action} aria-label={`Atualizar ${label}`} className="rounded-md p-1 transition hover:bg-black/5"><RefreshCw className={`h-3.5 w-3.5 ${spinning ? "animate-spin" : ""}`} /></button>}</div>;
}

export default function HedgeDashboard() {
  const [location, setLocation] = useLocation();
  const requestedPanel = dashboardPanelByPath[location] ?? "overview";
  const activePanel = requestedPanel;
  const panelClass = (panel: DashboardPanel) => panel === "exposures" || panel === "overview" ? "hidden" : activePanel === panel ? "" : "hidden";
  const di1VisualLoading = import.meta.env.DEV && typeof window !== "undefined" && new URLSearchParams(window.location.search).get("visual") === "di1-loading";
  const [ptaxDate, setPtaxDate] = useState(lastWeekday);
  const [ipcaPeriod, setIpcaPeriod] = useState(latestClosedMonth);
  const [exposures, setExposures] = useState<Exposure[]>([]);
  const [instrumentMasterRows, setInstrumentMasterRows] = useState<SessionInstrumentMasterRow[]>([]);
  const [hedgeRows, setHedgeRows] = useState<HedgeRow[]>([]);
  const [scenarioRows, setScenarioRows] = useState<FxScenarioSessionSnapshot["scenario"][]>([]);
  const [calculationRows, setCalculationRows] = useState<FxScenarioSessionSnapshot["calculations"]>([]);
  const [canonicalDataframes, setCanonicalDataframes] = useState<CanonicalHedgeDataframes>(() => emptyCanonicalHedgeDataframes());
  const [diCurveReference, setDiCurveReference] = useState<DiFutureCurveDataset | null>(null);
  const [commodityMarketLink, setCommodityMarketLink] = useState<{ alternativeId: string | null; status: CommodityMarketLinkStatus; observation: CommodityMarketLinkObservation | null }>({ alternativeId: null, status: "idle", observation: null });
  const collectB3MarketObservations = trpc.marketData.collectB3MarketObservations.useMutation();
  const catalogRequests = useMemo(() => {
    const situations = canonicalDataframes.economic_situation_dataframe;
    const unique = new Map<string, { family: "DI1" | "DOL" | "WDO" | "BGI" | "ICF" | "CNL" | "ETH" | "CCM" | "GLD" | "SOY" | "SJC"; horizonDate: string; instrumentType?: "FUTURE" | "OPTION" }>();
    for (const alternative of canonicalDataframes.hedge_alternative_dataframe) {
      const situation = situations.find(item => item.economic_situation_id === alternative.economic_situation_id);
      if (!situation) continue;
      const kind = alternative.alternative_kind;
      const family = kind.includes("DI1") ? "DI1" : kind.includes("WDO") ? "WDO" : kind.includes("DOL") ? "DOL" : situation.commodity_reference ?? null;
      if (!family) continue;
      const instrumentType = kind.includes("OPTION") ? "OPTION" : kind.includes("FUTURE") || kind === "B3_FRA_DI1" ? "FUTURE" : undefined;
      const key = `${family}|${situation.horizon_date}|${instrumentType ?? "ANY"}`;
      unique.set(key, { family, horizonDate: situation.horizon_date, instrumentType });
    }
    return Array.from(unique.values());
  }, [canonicalDataframes.economic_situation_dataframe, canonicalDataframes.hedge_alternative_dataframe]);
  const b3CatalogQuery = trpc.hedge.b3CompatibleContractCatalog.useQuery(
    catalogRequests.length ? { asOf: lastWeekday(), requests: catalogRequests } : skipToken,
    { retry: false, staleTime: 60_000 },
  );
  const b3ContractCatalog = b3CatalogQuery.data?.catalog ?? [];
  const [manualB3Lineage, setManualB3Lineage] = useState<B3ManualLineageRow[]>([]);
  const [b3NormalizedArtifacts, setB3NormalizedArtifacts] = useState<B3NormalizedArtifact[]>([]);
  const [selectedAlternativeId, setSelectedAlternativeId] = useState<string | null>(null);
  const [analysisCoveragePct, setAnalysisCoveragePct] = useState(100);
  const [advancedToolsOpen, setAdvancedToolsOpen] = useState(false);
  const [profileId, setProfileId] = useState(() => typeof window === "undefined" ? "perfil-local" : localStorage.getItem("hedge-lab.active-profile.v1") ?? "perfil-local");
  const [simulationHistory, setSimulationHistory] = useState<LocalSimulationVersion[]>(() => loadSimulationHistory(typeof window === "undefined" ? null : localStorage, typeof window === "undefined" ? "perfil-local" : localStorage.getItem("hedge-lab.active-profile.v1") ?? "perfil-local"));
  const [historyBaseHash, setHistoryBaseHash] = useState("");
  const [historyComparisonHash, setHistoryComparisonHash] = useState("");
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [notional, setNotional] = useState("");
  const [cashflowDate, setCashflowDate] = useState("");
  const [direction, setDirection] = useState<Exposure["direction"]>("PAYABLE");
  const parquetInput = useRef<HTMLInputElement>(null);
  const jsonBundleInput = useRef<HTMLInputElement>(null);
  const csvArtifactInput = useRef<HTMLInputElement>(null);

  const ptax = trpc.marketData.ptaxUsdDay.useQuery({ date: ptaxDate }, { retry: false });
  const ipca = trpc.marketData.ipcaMonthly.useQuery({ period: ipcaPeriod }, { retry: false });
  const ettj = trpc.marketData.anbimaEttj.useQuery(undefined, { retry: false });
  const igpm = trpc.marketData.igpmPublishedTable.useQuery({ sourceUrl: FGV_IGPM_2026, year: 2026 }, { retry: false });
  const createBundle = trpc.workspace.createScenarioBundle.useMutation({
    onSuccess: bundle => {
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `hedge-lab-${bundle.bundle_id}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Pacote exportado com hash de integridade.");
    },
    onError: error => toast.error(error.message),
  });
  const recordScenarioBundle = trpc.workspace.createScenarioBundle.useMutation({
    onSuccess: (bundle, variables) => {
      const version: LocalSimulationVersion = {
        bundle_id: bundle.bundle_id,
        bundle_sha256: bundle.bundle_sha256,
        exported_at_utc: bundle.exported_at_utc,
        scenario_id: variables.dataframes.scenario_dataframe[0]?.scenario_id ?? "sem-cenario",
        exposure_count: variables.dataframes.exposure_dataframe.length,
        bundle,
      };
      setSimulationHistory(current => {
        return appendSimulationHistory(current, version, typeof window === "undefined" ? null : localStorage, profileId);
      });
      toast.success("Versão imutável da simulação registrada localmente por hash.");
    },
    onError: error => toast.error(`A simulação foi calculada, mas sua versão não pôde ser registrada: ${error.message}`),
  });
  const exportParquetScenario = trpc.workspace.exportParquetScenario.useMutation({
    onSuccess: artifact => {
      const binary = Uint8Array.from(atob(artifact.bytesBase64), character => character.charCodeAt(0));
      const parquetUrl = URL.createObjectURL(new Blob([binary], { type: "application/vnd.apache.parquet" }));
      const anchor = document.createElement("a"); anchor.href = parquetUrl; anchor.download = `hedge-lab-sessao-${artifact.manifest.sha256.slice(0, 12)}.parquet`; anchor.click(); URL.revokeObjectURL(parquetUrl);
      const manifestUrl = URL.createObjectURL(new Blob([JSON.stringify(artifact.manifest, null, 2)], { type: "application/json" }));
      const manifestAnchor = document.createElement("a"); manifestAnchor.href = manifestUrl; manifestAnchor.download = `hedge-lab-sessao-${artifact.manifest.sha256.slice(0, 12)}.parquet.manifest.json`; manifestAnchor.click(); URL.revokeObjectURL(manifestUrl);
      toast.success("DataFrames da sessão exportados em Parquet com manifesto e hash.");
    }, onError: error => toast.error(error.message),
  });
  const restoreImportedSession = useCallback((bundle: HedgeLabScenarioBundle) => {
    const imported = bundle.dataframes.exposure_dataframe as Exposure[];
    setExposures(imported);
    setInstrumentMasterRows(bundle.dataframes.instrument_master_dataframe as SessionInstrumentMasterRow[]);
    setHedgeRows(bundle.dataframes.hedge_dataframe);
    setScenarioRows(bundle.dataframes.scenario_dataframe);
    setCalculationRows(bundle.dataframes.calculation_dataframe);
    setCanonicalDataframes({
      economic_situation_dataframe: bundle.dataframes.economic_situation_dataframe ?? [],
      risk_factor_dataframe: bundle.dataframes.risk_factor_dataframe ?? [],
      hedge_alternative_dataframe: bundle.dataframes.hedge_alternative_dataframe ?? [],
      hedge_sizing_dataframe: bundle.dataframes.hedge_sizing_dataframe ?? [],
      scenario_result_dataframe: bundle.dataframes.scenario_result_dataframe ?? [],
      b3_observation_link_dataframe: bundle.dataframes.b3_observation_link_dataframe ?? [],
    });
    toast.success(`Sessão restaurada: ${imported.length} exposição(ões), ${bundle.dataframes.lineage_dataframe.length} fonte(s) e todos os DataFrames conferidos.`);
  }, []);
  const importScenarioBundle = trpc.workspace.importScenarioBundle.useMutation({
    onSuccess: restoreImportedSession,
    onError: error => toast.error(error.message),
  });
  const importParquetScenario = trpc.workspace.importParquetScenario.useMutation({
    onSuccess: restoreImportedSession,
    onError: error => toast.error(error.message),
  });

  const ptaxQuote = ptax.data?.dataframe.at(-1);
  const ptaxUnavailable = ptax.data?.availabilityStatus === "unavailable";
  const ipcaObservation = ipca.data?.dataframe.find(row => row.localityId === "1") ?? ipca.data?.dataframe[0];
  const curve = useMemo(() => (ettj.data?.dataframe ?? []).map(row => ({ vertex: row.vertexBusinessDays, pre: row.ettjPrePctAa252 })), [ettj.data]);
  const selectedAlternative = useMemo(() => canonicalDataframes.hedge_alternative_dataframe.find(alternative => alternative.alternative_id === selectedAlternativeId) ?? null, [canonicalDataframes.hedge_alternative_dataframe, selectedAlternativeId]);
  const selectedSituation = useMemo(() => selectedAlternative ? canonicalDataframes.economic_situation_dataframe.find(situation => situation.economic_situation_id === selectedAlternative.economic_situation_id) ?? null : null, [canonicalDataframes.economic_situation_dataframe, selectedAlternative]);
  const selectedCommodityMarketFamily = useMemo(() => selectedSituation && selectedAlternative ? commodityMarketFamily(selectedSituation, selectedAlternative) : null, [selectedSituation, selectedAlternative]);

  const linkCommodityMarket = useCallback(async () => {
    if (!selectedCommodityMarketFamily || !selectedSituation || !selectedAlternativeId) return;
    const family = selectedCommodityMarketFamily;
    const alternativeId = selectedAlternativeId;
    setCommodityMarketLink({ alternativeId, status: "loading", observation: null });
    const wantsOption = selectedAlternative?.alternative_kind === "B3_DOL_OPTION" || selectedAlternative?.alternative_kind === "B3_COMMODITY_OPTION";
    const wantedType = wantsOption ? "OPTION" : "FUTURE";
    const catalogEntry = b3ContractCatalog.find(item => item.family === family && item.horizonDate === selectedSituation.horizon_date && item.instrumentType === wantedType);
    type CatalogEntry = typeof b3ContractCatalog[number];
    const publishCatalogMatch = (match: CatalogEntry["observations"][number], lineage: Exclude<CatalogEntry["lineage"], null>) => {
      const priceXml = lineage.price.xml;
      const instrumentXml = lineage.instrument.xml;
      if (!priceXml || !instrumentXml) return false;
      receiveB3ObservationSelection({
        alternativeId,
        candidate: match as any,
        priceSource: { reportType: "BVBG.086.01", sourceUrl: lineage.price.officialDownloadUrl, sourceFile: priceXml.sourceFile, sourceAsOf: lineage.price.sourceAsOf, sourceHashSha256: priceXml.sha256, normalizedCsvStorageKey: null, normalizedCsvSha256: null, normalizedManifestStorageKey: null },
        instrumentSource: { sourceUrl: lineage.instrument.officialDownloadUrl, sourceFile: instrumentXml.sourceFile, sourceAsOf: lineage.instrument.sourceAsOf, sourceHashSha256: instrumentXml.sha256, normalizedCsvStorageKey: null, normalizedCsvSha256: null, normalizedManifestStorageKey: null },
        selectedAtUtc: new Date().toISOString(),
      });
      setCommodityMarketLink({ alternativeId, status: "linked", observation: { symbol: match.symbol, adjustedQuote: match.adjustedQuote, lastPrice: match.lastPrice, maturity: match.maturity, sourceAsOf: lineage.price.sourceAsOf, sourceHashSha256: match.sourceHashSha256 ?? priceXml.sha256 } });
      return true;
    };
    try {
      const catalogMatch = catalogEntry?.observations[0];
      if (catalogMatch && catalogEntry.lineage) {
        publishCatalogMatch(catalogMatch, catalogEntry.lineage);
        return;
      }
      const asOf = lastWeekday();
      const result = await Promise.race([
        collectB3MarketObservations.mutateAsync({ family, asOf }),
        new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error("A consulta B3 excedeu 45 segundos; tente novamente.")), 45_000)),
      ]);
      const match = selectCompatibleB3Contracts(result.observations, family, selectedSituation.horizon_date, wantedType)[0] ?? null;
      const priceNormalization = result.normalizations.price.find(item => item.validationStatus === "valid") ?? result.normalizations.price[0];
      const instrumentNormalization = result.normalizations.instrument.find(item => item.validationStatus === "valid") ?? result.normalizations.instrument[0];
      if (match && priceNormalization && instrumentNormalization) {
        receiveB3ObservationSelection({
          alternativeId,
          candidate: match,
          priceSource: { reportType: "BVBG.086.01", sourceUrl: result.lineage.price.officialDownloadUrl, sourceFile: priceNormalization.sourceFile, sourceAsOf: result.lineage.price.sourceAsOf, sourceHashSha256: result.lineage.price.outerArchive.sha256, normalizedCsvStorageKey: priceNormalization.csv.storageKey, normalizedCsvSha256: priceNormalization.csv.sha256, normalizedManifestStorageKey: priceNormalization.manifest.storageKey },
          instrumentSource: { sourceUrl: result.lineage.instrument.officialDownloadUrl, sourceFile: instrumentNormalization.sourceFile, sourceAsOf: result.lineage.instrument.sourceAsOf, sourceHashSha256: result.lineage.instrument.outerArchive.sha256, normalizedCsvStorageKey: instrumentNormalization.csv.storageKey, normalizedCsvSha256: instrumentNormalization.csv.sha256, normalizedManifestStorageKey: instrumentNormalization.manifest.storageKey },
          selectedAtUtc: new Date().toISOString(),
        });
      }
      setCommodityMarketLink({ alternativeId, status: match ? "linked" : "not_found", observation: match ? { symbol: match.symbol, adjustedQuote: match.adjustedQuote, lastPrice: match.lastPrice, maturity: match.maturity, sourceAsOf: result.lineage.price.sourceAsOf, sourceHashSha256: result.lineage.price.outerArchive.sha256 } : null });
    } catch {
      setCommodityMarketLink({ alternativeId, status: "error", observation: null });
    }
  }, [selectedCommodityMarketFamily, selectedSituation, selectedAlternativeId, selectedAlternative, b3ContractCatalog, collectB3MarketObservations]);

  // A vinculação é por operação selecionada — trocar de alternativa reinicia o estado para não mostrar a cotação de outra série/vencimento.
  useEffect(() => {
    setCommodityMarketLink(current => current.alternativeId === selectedAlternativeId ? current : { alternativeId: selectedAlternativeId, status: "idle", observation: null });
  }, [selectedAlternativeId]);
  const selectedAlternativeNeedsB3 = Boolean(selectedAlternative?.source_ids.includes("B3_PUBLIC_FILES"));
  const selectedAlternativeIsRateHedge = selectedAlternative?.alternative_kind === "B3_DI1_FUTURE" || selectedAlternative?.alternative_kind === "B3_FRA_DI1" || selectedAlternative?.alternative_kind === "B3_DI1_OPTION";
  const selectedAlternativeIsCdiDi1 = selectedAlternative?.alternative_kind === "B3_DI1_FUTURE" && selectedSituation?.situation_kind === "CDI_LINKED_DEBT";
  const selectedAlternativeIsFx = selectedAlternative?.alternative_kind === "B3_DOL_FUTURE" || selectedAlternative?.alternative_kind === "B3_WDO_FUTURE" || selectedAlternative?.alternative_kind === "B3_DOL_OPTION";
  const selectedAlternativeIsCommodity = selectedAlternative?.alternative_kind === "B3_COMMODITY_FUTURE" || selectedAlternative?.alternative_kind === "B3_COMMODITY_OPTION";
  const selectedAlternativeIsOtc = selectedAlternative?.alternative_kind === "OTC_NDF_OR_TERM" || selectedAlternative?.alternative_kind === "OTC_FX_SWAP" || selectedAlternative?.alternative_kind === "OTC_RATE_SWAP";
  const selectedCommodityMarketObservation = commodityMarketLink.alternativeId === selectedAlternativeId ? commodityMarketLink.observation : null;
  const selectedCatalogObservation = useMemo(() => {
    if (!selectedSituation || !selectedAlternative) return null;
    const family = commodityMarketFamily(selectedSituation, selectedAlternative);
    if (!family) return null;
    const wantsOption = selectedAlternative.alternative_kind === "B3_DOL_OPTION" || selectedAlternative.alternative_kind === "B3_COMMODITY_OPTION";
    const wantedType = wantsOption ? "OPTION" : "FUTURE";
    const entry = b3ContractCatalog.find(item => item.family === family && item.horizonDate === selectedSituation.horizon_date && item.instrumentType === wantedType);
    return entry?.observations[0] ?? null;
  }, [selectedSituation, selectedAlternative, b3ContractCatalog]);
  // Ao selecionar uma alternativa B3, inicia automaticamente a busca da série/observação oficial.
  // A ação manual permanece disponível como nova tentativa quando a fonte estiver indisponível.
  useEffect(() => {
    if (!selectedAlternativeId || !selectedAlternativeNeedsB3 || !selectedSituation || commodityMarketLink.status !== "idle") return;
    void linkCommodityMarket();
  }, [commodityMarketLink.status, linkCommodityMarket, selectedAlternativeId, selectedAlternativeNeedsB3, selectedSituation]);
  const sourceLineage = useMemo(() => {
    const entries = [ptax.data?.lineage, ipca.data?.lineage, ettj.data?.lineage, igpm.data?.lineage].filter(Boolean);
    return [...entries.map(item => ({
      source_id: item!.sourceId,
      source_url: item!.sourceUrl,
      source_file: item!.sourceFile,
      extracted_at_utc: item!.extractedAtUtc,
      source_asof: item!.sourceAsOf,
      source_hash_sha256: item!.sourceHashSha256,
      parser_version: item!.parserVersion,
      validation_status: item!.validationStatus,
    })), ...manualB3Lineage];
  }, [ptax.data, ipca.data, ettj.data, igpm.data, manualB3Lineage]);
  const recordedSnapshotFingerprints = useRef(new Set<string>());
  const publishedSnapshotFingerprints = useRef(new Map<string, string>());
  const recordSessionSnapshot = useCallback((snapshot: SessionCalculationSnapshot | null) => {
    if (!snapshot) return;
    const fingerprint = JSON.stringify({
      scenario: { ...snapshot.scenario, created_at_utc: undefined },
      calculations: snapshot.calculations.map(calculation => ({ ...calculation, calculated_at_utc: undefined })),
    });
    if (publishedSnapshotFingerprints.current.get(snapshot.scenario.scenario_id) === fingerprint) return;
    publishedSnapshotFingerprints.current.set(snapshot.scenario.scenario_id, fingerprint);
    const withContractualSizing = attachCanonicalFxSwapSizing(attachCanonicalRateSwapSizing(attachCanonicalNdfSizing(canonicalDataframes, { instrumentMasterRows, hedgeRows }), { instrumentMasterRows, hedgeRows }), { instrumentMasterRows, hedgeRows });
    const nextCanonicalDataframes = attachEligibleCanonicalScenarioResults(withContractualSizing, snapshot.scenario, snapshot.calculations, { instrumentMasterRows, hedgeRows });
    setScenarioRows(current => [snapshot.scenario, ...current.filter(row => row.scenario_id !== snapshot.scenario.scenario_id)]);
    setCalculationRows(current => [...snapshot.calculations, ...current.filter(row => !snapshot.calculations.some(calculation => calculation.calculation_id === row.calculation_id))]);
    setCanonicalDataframes(nextCanonicalDataframes);
    const historyFingerprint = `${snapshot.scenario.scenario_id}:${fingerprint}`;
    if (recordedSnapshotFingerprints.current.has(historyFingerprint)) return;
    recordedSnapshotFingerprints.current.add(historyFingerprint);
    recordScenarioBundle.mutate({
      bundle_schema_version: "1.0.0",
      bundle_id: `simulacao-${snapshot.scenario.scenario_id}-${new Date().toISOString().replace(/[:.]/g, "-")}`,
      exported_at_utc: new Date().toISOString(),
      dataframes: {
        instrument_master_dataframe: instrumentMasterRows,
        exposure_dataframe: exposures.map(exposureToRow),
        hedge_dataframe: hedgeRows,
        scenario_dataframe: [snapshot.scenario],
        calculation_dataframe: snapshot.calculations,
        lineage_dataframe: sourceLineage,
        ...nextCanonicalDataframes,
      },
    });
  }, [canonicalDataframes, exposures, hedgeRows, instrumentMasterRows, profileId, recordScenarioBundle, sourceLineage]);
  const receiveCanonicalDiagnosis = useCallback((dataframes: CanonicalHedgeDataframes) => {
    setCanonicalDataframes(current => {
      const merged = mergeCanonicalDataframes(current, dataframes);
      return attachCanonicalFxSwapSizing(attachCanonicalRateSwapSizing(attachCanonicalNdfSizing(merged, { instrumentMasterRows, hedgeRows }), { instrumentMasterRows, hedgeRows }), { instrumentMasterRows, hedgeRows });
    });
  }, [hedgeRows, instrumentMasterRows]);
  const receiveGuidedExposure = useCallback((publication: GuidedExposurePublication) => {
    const isPhysical = publication.exposureClass === "PHYSICAL_COMMODITY";
    setExposures(current => [{
      exposure_id: publication.exposureId,
      description: publication.description,
      currency: publication.currency,
      direction: publication.direction,
      // Quantidade física NUNCA é publicada como nocional monetário — evita que 1.000 sacas vire "R$ 1.000,00".
      notional: isPhysical ? 0 : publication.amount,
      cashflow_date: publication.maturityDate,
      created_at_utc: new Date().toISOString(),
      exposureClass: publication.exposureClass,
      physicalQuantity: isPhysical ? publication.physicalQuantity ?? publication.amount : null,
      physicalUnit: isPhysical ? publication.physicalUnit ?? publication.unit : null,
      commodityReference: publication.commodityReference,
    }, ...current.filter(row => row.exposure_id !== publication.exposureId)]);
  }, []);
  useEffect(() => {
    setCanonicalDataframes(current => attachCanonicalFxSwapSizing(attachCanonicalRateSwapSizing(attachCanonicalNdfSizing(current, { instrumentMasterRows, hedgeRows }), { instrumentMasterRows, hedgeRows }), { instrumentMasterRows, hedgeRows }));
  }, [hedgeRows, instrumentMasterRows]);
  const receiveFxScenarioSnapshot = useCallback((snapshot: FxScenarioSessionSnapshot | null) => recordSessionSnapshot(snapshot), [recordSessionSnapshot]);
  const receiveResidualRiskSnapshot = useCallback((snapshot: ResidualRiskSessionSnapshot | null) => recordSessionSnapshot(snapshot), [recordSessionSnapshot]);
  const receiveNdfSnapshot = useCallback((snapshot: NdfSessionSnapshot | null) => recordSessionSnapshot(snapshot), [recordSessionSnapshot]);
  const receiveEffectivenessSnapshot = useCallback((snapshot: EffectivenessSessionSnapshot | null) => recordSessionSnapshot(snapshot), [recordSessionSnapshot]);
  const receiveOtcMaster = useCallback((master: OtcSessionInstrumentMasterRow) => {
    setInstrumentMasterRows(current => [master, ...current.filter(row => row.instrument_id !== master.instrument_id)]);
  }, []);
  const receiveOtcHedge = useCallback((hedge: OtcHedgeSessionRow) => {
    setHedgeRows(current => [hedge, ...current.filter(row => row.hedge_id !== hedge.hedge_id)]);
  }, []);
  const receiveB3Specification = useCallback((row: B3ProductSpecificationSessionRow) => {
    setInstrumentMasterRows(current => [row, ...current.filter(item => item.instrument_id !== row.instrument_id)]);
    toast.success("Especificação B3 oficial adicionada ao DataFrame da sessão; série contratual permanece bloqueada.");
  }, []);
  const receiveFxFutureSizing = useCallback((publication: FxFutureSizingSessionPublication) => {
    const next = attachCanonicalFxFutureSizing(canonicalDataframes, publication, instrumentMasterRows);
    if (next === canonicalDataframes) {
      toast.error("Registre o diagnóstico da exposição e carregue a especificação oficial do contrato antes de publicar o dimensionamento.");
      return;
    }
    setCanonicalDataframes(next);
    toast.success("Cobertura DOL/WDO registrada no DataFrame canônico da sessão.");
  }, [canonicalDataframes, instrumentMasterRows]);
  const receiveFxOptionSizing = useCallback((publication: FxOptionSizingPublication) => {
    const next = attachCanonicalFxOptionSizing(canonicalDataframes, publication, instrumentMasterRows);
    if (next === canonicalDataframes) {
      toast.error("Registre o diagnóstico USD, carregue a ficha DOL e selecione a série B3 de opção antes de publicar a referência nocional.");
      return;
    }
    setCanonicalDataframes(next);
    toast.success("Referência nocional máxima da opção DOL registrada no DataFrame canônico da sessão.");
  }, [canonicalDataframes, instrumentMasterRows]);
  const receiveCommodityFutureSizing = useCallback((publication: CommodityFutureSizingPublication) => {
    const next = attachCanonicalCommodityFutureSizing(canonicalDataframes, publication, instrumentMasterRows);
    if (next === canonicalDataframes) {
      toast.error("Registre o diagnóstico de commodity, confirme a unidade física e carregue a especificação B3 correspondente antes de publicar o dimensionamento.");
      return;
    }
    setCanonicalDataframes(next);
    toast.success("Cobertura física de commodity registrada no DataFrame canônico da sessão.");
  }, [canonicalDataframes, instrumentMasterRows]);
  const receiveCommodityOptionSizing = useCallback((publication: CommodityOptionSizingPublication) => {
    const next = attachCanonicalCommodityOptionSizing(canonicalDataframes, publication, instrumentMasterRows);
    if (next === canonicalDataframes) {
      toast.error("Registre o diagnóstico, carregue a ficha específica da opção e selecione a série B3 correspondente antes de publicar a referência física.");
      return;
    }
    setCanonicalDataframes(next);
    toast.success("Referência física máxima da opção registrada no DataFrame canônico da sessão.");
  }, [canonicalDataframes, instrumentMasterRows]);
  const receiveB3ObservationSelection = useCallback((publication: B3ObservationSelectionPublication) => {
    const next = attachCanonicalB3ObservationLink(canonicalDataframes, publication);
    if (next === canonicalDataframes) {
      toast.error("A observação não foi vinculada: confira alternativa B3, data-base, série e evidências dos dois artefatos.");
      return;
    }
    setCanonicalDataframes(next);
    toast.success("Série B3 escolhida vinculada à alternativa no DataFrame canônico; dimensionamento e precificação seguem condicionados.");
  }, [canonicalDataframes]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("hedge-lab.active-profile.v1", profileId);
    setSimulationHistory(loadSimulationHistory(localStorage, profileId));
  }, [profileId]);
  const consolidatedExposure = useMemo(() => {
    const byCurrency = new Map<string, { currency: string; receivable: number; payable: number; net: number; records: number; nextCashflow: string | null }>();
    for (const exposure of exposures) {
      const bucket = byCurrency.get(exposure.currency) ?? { currency: exposure.currency, receivable: 0, payable: 0, net: 0, records: 0, nextCashflow: null };
      if (exposure.direction === "RECEIVABLE") bucket.receivable += exposure.notional;
      else bucket.payable += exposure.notional;
      bucket.net = bucket.receivable - bucket.payable;
      bucket.records += 1;
      if (!bucket.nextCashflow || exposure.cashflow_date < bucket.nextCashflow) bucket.nextCashflow = exposure.cashflow_date;
      byCurrency.set(exposure.currency, bucket);
    }
    return Array.from(byCurrency.values()).sort((left, right) => left.currency.localeCompare(right.currency));
  }, [exposures]);
  const latestResidualRisk = useMemo(() => {
    const result = calculationRows.find(row => row.method === "RESIDUAL_PARAMETRIC_VAR" && row.calculation_status === "SUCCESS")?.result;
    const residualVar = result?.residual_var_brl;
    const coverage = result?.coverage_pct;
    return typeof residualVar === "number" && Number.isFinite(residualVar) ? { residualVar, coverage: typeof coverage === "number" && Number.isFinite(coverage) ? coverage : null } : null;
  }, [calculationRows]);
  const historyComparison = useMemo(() => {
    const base = simulationHistory.find(version => version.bundle_sha256 === historyBaseHash);
    const comparison = simulationHistory.find(version => version.bundle_sha256 === historyComparisonHash);
    const baseTotals = totalsByCurrencyFromVersion(base);
    const comparisonTotals = totalsByCurrencyFromVersion(comparison);
    const currencies = Array.from(new Set([...Array.from(baseTotals.keys()), ...Array.from(comparisonTotals.keys())])).sort();
    return { base, comparison, rows: currencies.map(currency => ({ currency, base: baseTotals.get(currency) ?? 0, comparison: comparisonTotals.get(currency) ?? 0 })) };
  }, [historyBaseHash, historyComparisonHash, simulationHistory]);
  const auditCalculationMemory = useMemo(() => calculationRows.flatMap(calculation => [
    `Módulo ${calculation.method} | status ${calculation.calculation_status} | versão ${calculation.formula_version} | cenário ${calculation.scenario_id}.`,
    `Resultado registrado: ${JSON.stringify(calculation.result)}.`,
  ]), [calculationRows]);
  const auditLimitations = useMemo(() => Array.from(new Set([
    ...calculationRows.flatMap(calculation => calculation.warnings),
    "O relatório representa apenas DataFrames e cálculos efetivamente executados na sessão, sem recalcular preços de mercado.",
    "MTM, Greeks e contabilização automática permanecem bloqueados sem os insumos oficiais e a governança aplicável.",
  ])), [calculationRows]);

  function addExposure() {
    const parsedNotional = Number(notional.replace(",", "."));
    if (!description.trim() || !/^[A-Z]{3}$/.test(currency) || !Number.isFinite(parsedNotional) || parsedNotional <= 0 || !cashflowDate) {
      toast.error("Preencha descrição, moeda ISO, nocional positivo e data do fluxo.");
      return;
    }
    setExposures(current => [...current, { exposure_id: crypto.randomUUID(), description: description.trim(), currency, direction, notional: parsedNotional, cashflow_date: cashflowDate, created_at_utc: new Date().toISOString(), exposureClass: "FINANCIAL", physicalQuantity: null, physicalUnit: null, commodityReference: null }]);
    setDescription(""); setNotional(""); setCashflowDate("");
    toast.success("Exposição incluída no DataFrame da sessão.");
  }

  function sessionDataframes() {
    return {
      instrument_master_dataframe: instrumentMasterRows,
      exposure_dataframe: exposures.map(exposureToRow),
      hedge_dataframe: hedgeRows,
      scenario_dataframe: scenarioRows,
      calculation_dataframe: calculationRows,
      lineage_dataframe: sourceLineage,
      ...canonicalDataframes,
    };
  }

  function exportSession() {
    createBundle.mutate({
      bundle_schema_version: "1.0.0",
      bundle_id: `sessao-${new Date().toISOString().replace(/[:.]/g, "-")}`,
      exported_at_utc: new Date().toISOString(),
      dataframes: sessionDataframes(),
    });
  }

  function exportSessionParquet() {
    const dataframes = sessionDataframes();
    exportParquetScenario.mutate({
      bundle_schema_version: "1.0.0",
      bundle_id: `sessao-${new Date().toISOString().replace(/[:.]/g, "-")}`,
      exported_at_utc: new Date().toISOString(),
      dataframes,
    });
  }

  async function exportExposureCsvArtifact() {
    try {
      if (exposures.length === 0) throw new Error("Cadastre ao menos uma exposição antes de exportar o CSV auditável.");
      const csvRows = exposures.map(exposureToRow);
      const artifact = await createExposureCsvArtifact(csvRows, sourceLineage as Array<Record<string, unknown>>);
      const filePrefix = `hedge-lab-exposicoes-${artifact.manifest.sha256.slice(0, 12)}`;
      const csvUrl = URL.createObjectURL(new Blob(["\ufeff", artifact.csv], { type: "text/csv;charset=utf-8" }));
      const csvAnchor = document.createElement("a"); csvAnchor.href = csvUrl; csvAnchor.download = `${filePrefix}.csv`; csvAnchor.click(); URL.revokeObjectURL(csvUrl);
      const manifestUrl = URL.createObjectURL(new Blob([JSON.stringify(artifact.manifest, null, 2)], { type: "application/json" }));
      const manifestAnchor = document.createElement("a"); manifestAnchor.href = manifestUrl; manifestAnchor.download = `${filePrefix}.csv.manifest.json`; manifestAnchor.click(); URL.revokeObjectURL(manifestUrl);
      toast.success("Exposições exportadas em CSV com manifesto, linhagem e hash SHA-256.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível exportar o CSV auditável.");
    }
  }

  async function importSessionParquet(files: File[]) {
    try {
      const { bytesBase64, manifest } = await prepareParquetSessionImport(files);
      importParquetScenario.mutate({ bytesBase64, manifest: manifest as never });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível preparar a importação Parquet.");
    }
  }

  async function importSessionJson(file: File) {
    try {
      const serializedBundle = await file.text();
      if (!serializedBundle.trim()) throw new Error("O pacote JSON selecionado está vazio.");
      importScenarioBundle.mutate({ serializedBundle });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível preparar a importação JSON.");
    }
  }

  async function importExposureCsvArtifact(files: File[]) {
    try {
      const csv = files.find(file => file.name.toLowerCase().endsWith(".csv"));
      const manifest = files.find(file => file.name.toLowerCase().endsWith(".csv.manifest.json"));
      if (!csv || !manifest || files.length !== 2) throw new Error("Selecione, juntos, o arquivo .csv e o respectivo .csv.manifest.json.");
      const [csvText, manifestText] = await Promise.all([csv.text(), manifest.text()]);
      const imported = await readExposureCsvArtifact(csvText.replace(/^\ufeff/, ""), JSON.parse(manifestText) as ExposureCsvManifest);
      setExposures(imported.map(row => ({
        exposure_id: row.exposure_id, description: row.description, currency: row.currency, direction: row.direction,
        notional: row.notional, cashflow_date: row.cashflow_date, created_at_utc: row.created_at_utc,
        // CSVs exportados antes desta versão não têm exposure_class; tratamos como FINANCIAL para não perder o registro (compatibilidade retroativa).
        exposureClass: row.exposure_class ?? "FINANCIAL", physicalQuantity: row.physical_quantity ?? null, physicalUnit: row.physical_unit ?? null, commodityReference: (row.commodity_reference ?? null) as Exposure["commodityReference"],
      })));
      toast.success(`DataFrame CSV restaurado: ${imported.length} exposição(ões) conferida(s) por hash.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível importar o CSV auditável.");
    }
  }

  function removeExposure(exposureId: string) {
    setExposures(current => current.filter(exposure => exposure.exposure_id !== exposureId));
    toast.success("Exposição removida do DataFrame da sessão.");
  }

  return <section className="mx-auto max-w-[1540px]"><div className={requestedPanel === "overview" ? "" : "hidden"}><ConsultantCommandCenter exposureCount={exposures.length} alternativeCount={canonicalDataframes.hedge_alternative_dataframe.length} onCreateExposure={() => setLocation("/exposicoes")} onReviewAlternatives={() => setLocation("/exposicoes")} onOpenTechnicalBase={() => setLocation("/dados")} sourceStatuses={[{ label: "BCB / PTAX", loaded: Boolean(ptax.data), detail: ptax.data ? "Cotação oficial consultada" : ptaxUnavailable ? "Cotação não publicada para a data-base" : "Consulta automática em andamento" }, { label: "ANBIMA / ETTJ", loaded: Boolean(ettj.data), detail: ettj.data ? "Curva oficial recuperada" : "Consulta automática em andamento" }, { label: "IBGE / IPCA", loaded: Boolean(ipca.data), detail: ipca.data ? "Competência oficial recuperada" : "Consulta automática em andamento" }, { label: "FGV / IGP-M", loaded: Boolean(igpm.data), detail: igpm.data ? "Publicação oficial recuperada" : "Aguardando atualização automática" }, { label: "B3", loaded: manualB3Lineage.length > 0, detail: manualB3Lineage.length ? "Arquivos oficiais na sessão" : "Verificando arquivos oficiais" }]} /></div>
    <div className={`grid gap-5 xl:grid-cols-[1.5fr_.78fr] ${panelClass("overview")}`}>
      <div className="rounded-3xl bg-[#15353d] px-6 py-7 text-white shadow-[0_24px_55px_-32px_rgba(17,61,67,.8)] sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><Badge className="border-0 bg-[#2a5a5b] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#a6f2df]">Laboratório financeiro institucional</Badge><h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.025em] sm:text-4xl">Evidência antes da decisão de hedge.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#abc2c8]">Consolide exposições, valide premissas e gere um rastro auditável antes da decisão. Nenhuma posição é persistida em base de dados.</p></div><div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 font-mono text-[11px] text-[#c7dcdf]"><p className="text-[#72d2bf]">SESSÃO / AUDITÁVEL</p><p className="mt-1">{sourceLineage.length} fontes validadas</p></div></div>
        <div className="mt-7 flex flex-wrap gap-2"><Button onClick={exportSession} disabled={createBundle.isPending} className="bg-[#69d8bd] text-[#0c3637] hover:bg-[#88e3cd]">{createBundle.isPending ? <Loader2 className="animate-spin" /> : <ArrowDownToLine />} Exportar pacote</Button><Button variant="outline" onClick={() => jsonBundleInput.current?.click()} disabled={importScenarioBundle.isPending} className="border-white/15 bg-white/[0.02] text-white hover:bg-white/[0.08] hover:text-white">{importScenarioBundle.isPending ? <Loader2 className="animate-spin" /> : <FileJson2 />} Importar JSON</Button><input ref={jsonBundleInput} type="file" accept="application/json,.json" className="hidden" onChange={event => event.target.files?.[0] && importSessionJson(event.target.files[0])} /><Button variant="outline" onClick={exportSessionParquet} disabled={exportParquetScenario.isPending} className="border-white/15 bg-white/[0.02] text-white hover:bg-white/[0.08] hover:text-white">{exportParquetScenario.isPending ? <Loader2 className="animate-spin" /> : <FileJson2 />} Parquet + manifesto</Button><Button variant="outline" onClick={() => parquetInput.current?.click()} disabled={importParquetScenario.isPending} className="border-white/15 bg-white/[0.02] text-white hover:bg-white/[0.08] hover:text-white">{importParquetScenario.isPending ? <Loader2 className="animate-spin" /> : <FileJson2 />} Importar Parquet</Button><input ref={parquetInput} type="file" multiple accept=".parquet,.json,application/vnd.apache.parquet,application/json" className="hidden" onChange={event => event.target.files && importSessionParquet(Array.from(event.target.files))} /><Button variant="outline" onClick={() => downloadCsv("hedge-lab-exposicoes.csv", exposures)} disabled={exposures.length === 0} className="border-white/15 bg-white/[0.02] text-white hover:bg-white/[0.08] hover:text-white"><ArrowDownToLine /> DataFrame CSV</Button><Button variant="outline" onClick={() => downloadAuditPdf({ scenarioId: scenarioRows.map(row => row.scenario_id).join("+") || `sessao-${new Date().toISOString().replace(/[:.]/g, "-")}`, exposures, lineage: sourceLineage, calculationMemory: auditCalculationMemory.length ? auditCalculationMemory : undefined, limitations: auditLimitations })} className="border-white/15 bg-white/[0.02] text-white hover:bg-white/[0.08] hover:text-white"><FileJson2 /> Relatório PDF</Button><Button variant="outline" onClick={() => igpm.refetch()} disabled={igpm.isFetching} className="border-white/15 bg-white/[0.02] text-white hover:bg-white/[0.08] hover:text-white">{igpm.isFetching ? <Loader2 className="animate-spin" /> : <RefreshCw />} Atualizar IGP-M</Button></div>
      </div>
      <Card className="rounded-3xl border-[#dbe8e5] bg-white shadow-[0_20px_45px_-36px_rgba(16,58,58,.45)]"><CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="text-sm font-semibold text-[#1b3941]">Integridade operacional</CardTitle><ShieldCheck className="h-5 w-5 text-[#28a584]" /></div></CardHeader><CardContent className="space-y-3"><div className="flex items-center justify-between border-b border-[#edf2f0] pb-3 text-xs"><span className="text-[#668087]">Persistência relacional</span><span className="font-semibold text-[#304f58]">Desativada</span></div><div className="flex items-center justify-between border-b border-[#edf2f0] pb-3 text-xs"><span className="text-[#668087]">Autenticação do template</span><span className="font-semibold text-[#304f58]">Não requerida</span></div><div className="flex items-center justify-between border-b border-[#edf2f0] pb-3 text-xs"><span className="text-[#668087]">Motor de risco</span><span className="font-semibold text-[#ab641f]">Aguardando preços B3</span></div><div className="flex items-center justify-between text-xs"><span className="text-[#668087]">Versão do pacote</span><span className="font-mono font-semibold text-[#304f58]">1.0.0</span></div></CardContent></Card>
    </div>

    <Card className={`mt-5 rounded-2xl border-[#dce8e5] bg-[#f9fcfb] shadow-none ${panelClass("overview")}`}><CardContent className="flex flex-wrap items-center justify-between gap-4 p-4"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#5f8981]">Intercâmbio de DataFrame</p><p className="mt-1 text-xs leading-5 text-[#5d7875]">O CSV de exposições é acompanhado por manifesto, linhagem e SHA-256. A importação substitui somente o DataFrame de exposições após conferência do par.</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={exportExposureCsvArtifact} disabled={exposures.length === 0} className="border-[#c9e3dc] bg-white text-[#1c6155] hover:bg-[#edf9f5]"><ArrowDownToLine /> CSV + manifesto</Button><Button variant="outline" onClick={() => csvArtifactInput.current?.click()} className="border-[#c9e3dc] bg-white text-[#1c6155] hover:bg-[#edf9f5]"><FileJson2 /> Importar CSV</Button><input ref={csvArtifactInput} type="file" multiple accept=".csv,.json,text/csv,application/json" className="hidden" onChange={event => event.target.files && importExposureCsvArtifact(Array.from(event.target.files))} /></div></CardContent></Card>

    <div aria-live="polite" aria-atomic="true" className={`mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4 ${panelClass("overview")}`}><Metric label="Exposição econômica" value={exposures.length ? `${exposures.length} registro(s)` : "Sem exposição"} detail="DataFrame mantido apenas nesta sessão." /><Metric label="PTAX / USD" value={ptaxQuote ? formatNumber(ptaxQuote.cotacaoVenda) : "—"} detail={ptaxQuote ? `Venda • data-base ${ptaxQuote.asOf}` : ptaxUnavailable ? "O BCB não publicou cotação para a data-base; nenhuma taxa substituta foi utilizada." : ptax.isError ? "A consulta oficial não pôde ser concluída; tente novamente." : "Aguardando consulta oficial."} tone={ptaxUnavailable || ptax.isError ? "amber" : "mint"} /><Metric label="IPCA mensal" value={ipcaObservation?.value !== null && ipcaObservation?.value !== undefined ? `${formatNumber(ipcaObservation.value, 2)}%` : "—"} detail={ipcaObservation ? `${ipcaObservation.period} • tabela 1737 / IBGE` : "Competência indisponível."} tone="mint" /><Metric label="VaR residual" value={latestResidualRisk ? formatMoney(latestResidualRisk.residualVar, "BRL") : "Indisponível"} detail={latestResidualRisk ? `Último cálculo da sessão${latestResidualRisk.coverage === null ? "." : ` • cobertura ${formatNumber(latestResidualRisk.coverage * 100, 2)}%`}` : "Requer cálculo de risco residual com parâmetros e linhagem válidos."} tone="amber" /></div>

    <Card className={`mt-7 overflow-hidden rounded-2xl border-[#dce8e5] bg-white shadow-[0_22px_45px_-38px_rgba(16,58,58,.4)] ${panelClass("overview")}`}><CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-[#edf2f0] pb-4"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#6c8990]">Visão consolidada</p><CardTitle className="mt-1 text-base text-[#17363e]">Exposição econômica por moeda e vencimento</CardTitle><p className="mt-1 text-xs leading-5 text-[#6d858c]">Saldo líquido econômico calculado apenas a partir das exposições declaradas nesta sessão.</p></div><Badge variant="outline" className="border-[#d7e6e2] bg-[#f6fbf9] text-[10px] font-semibold text-[#317364]">SEM MTM INFERIDO</Badge></CardHeader><CardContent className="p-0">{consolidatedExposure.length === 0 ? <div className="px-6 py-10 text-sm text-[#70868c]">Cadastre exposições para consolidar moeda, direção econômica e vencimento. Não são criadas posições de exemplo.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-xs"><thead className="bg-[#f8fbfa] text-[10px] font-semibold uppercase tracking-[.1em] text-[#718b90]"><tr><th className="px-5 py-3">Moeda</th><th className="px-5 py-3 text-right">Recebível</th><th className="px-5 py-3 text-right">Pagável</th><th className="px-5 py-3 text-right">Líquido</th><th className="px-5 py-3">Próximo vencimento</th><th className="px-5 py-3 text-right">Registros</th></tr></thead><tbody className="divide-y divide-[#edf2f0]">{consolidatedExposure.map(bucket => <tr key={bucket.currency} className="text-[#34535a]"><td className="px-5 py-4 font-mono font-semibold">{bucket.currency}</td><td className="px-5 py-4 text-right font-mono">{formatMoney(bucket.receivable, bucket.currency)}</td><td className="px-5 py-4 text-right font-mono">{formatMoney(bucket.payable, bucket.currency)}</td><td className={`px-5 py-4 text-right font-mono font-semibold ${bucket.net >= 0 ? "text-[#187c68]" : "text-[#a75830]"}`}>{formatMoney(bucket.net, bucket.currency)}</td><td className="px-5 py-4 font-mono text-[#617d84]">{bucket.nextCashflow ?? "—"}</td><td className="px-5 py-4 text-right font-mono">{bucket.records}</td></tr>)}</tbody></table></div>}<div className="grid gap-3 border-t border-[#edf2f0] bg-[#fbfdfc] px-5 py-4 text-[11px] leading-5 text-[#6b8489] md:grid-cols-3"><p><strong className="text-[#34565b]">MTM:</strong> bloqueado até existir instrumento associado e preços B3 suficientes, na mesma data-base validada.</p><p><strong className="text-[#34565b]">Greeks:</strong> bloqueados sem opção identificada, volatilidade observável e insumos B3 rastreáveis.</p><p><strong className="text-[#34565b]">Juros:</strong> sem exposição por índice/taxa declarada, não há consolidação de risco de taxa.</p></div></CardContent></Card>

    <Card id="hedge-section-history" className={`mt-7 scroll-mt-28 rounded-2xl border-[#dce8e5] bg-[#f9fcfb] shadow-none ${panelClass("history")}`}><CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-[#e8f0ed] pb-4"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#6c8990]">Versões imutáveis</p><CardTitle className="mt-1 text-base text-[#17363e]">Histórico local de simulações</CardTitle><p className="mt-1 text-xs leading-5 text-[#6d858c]">Cada resultado executado de cenário FX, NDF, risco residual ou efetividade gera um bundle validado por hash neste navegador; os dados não são enviados a banco.</p></div><Badge variant="outline" className="border-[#d7e6e2] bg-white text-[10px] font-semibold text-[#317364]">{simulationHistory.length}/20 versões</Badge></CardHeader><CardContent className="p-0"><div className="border-b border-[#e8f0ed] px-5 py-4"><Label htmlFor="local-profile" className="text-[11px] text-[#58747a]">Perfil local do navegador</Label><Input id="local-profile" value={profileId} onChange={event => setProfileId(event.target.value)} maxLength={48} className="mt-1.5 max-w-sm border-[#d6e5e1] bg-white text-sm" /><p className="mt-1.5 text-[10px] leading-4 text-[#7a9092]">Este identificador separa históricos neste dispositivo; não é autenticação nem é enviado ao servidor.</p></div>{simulationHistory.length === 0 ? <p className="px-5 py-5 text-xs leading-5 text-[#72898d]">Execute um cenário ou cálculo elegível para criar a primeira versão imutável.</p> : <div className="divide-y divide-[#e7efec]">{simulationHistory.slice(0, 5).map(version => <div key={version.bundle_sha256} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-xs"><div><p className="font-medium text-[#31565a]">{version.scenario_id}</p><p className="mt-1 font-mono text-[10px] text-[#6d858b]">{version.bundle_sha256.slice(0, 20)}… · {new Date(version.exported_at_utc).toLocaleString("pt-BR")}</p></div><span className="rounded-md bg-white px-2 py-1 font-mono text-[10px] text-[#4f716e]">{version.exposure_count} exposição(ões)</span></div>)}</div>}<p className="border-t border-[#e8f0ed] px-5 py-3 text-[11px] text-[#758b8e]">Para comparação, exporte os pacotes de cenário e use o comparador validado por SHA-256 abaixo.</p></CardContent></Card>

    <Card className={`mt-7 rounded-2xl border-[#dce8e5] bg-white shadow-none ${panelClass("history")}`}><CardHeader className="border-b border-[#edf2f0] pb-4"><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#6c8990]">Comparação direta</p><CardTitle className="mt-1 text-base text-[#17363e]">Versões armazenadas neste perfil local</CardTitle><p className="mt-1 text-xs leading-5 text-[#6d858c]">A comparação usa os bundles já hasheados no navegador e não recalcula preços, risco ou fontes de mercado.</p></CardHeader><CardContent className="p-5"><div className="grid gap-4 md:grid-cols-2"><div><Label htmlFor="history-base" className="text-xs">Versão base</Label><select id="history-base" value={historyBaseHash} onChange={event => setHistoryBaseHash(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-[#d7e6e2] bg-white px-3 text-sm text-[#37575b]"><option value="">Selecione uma versão</option>{simulationHistory.map(version => <option key={version.bundle_sha256} value={version.bundle_sha256}>{version.scenario_id} · {new Date(version.exported_at_utc).toLocaleString("pt-BR")}</option>)}</select></div><div><Label htmlFor="history-comparison" className="text-xs">Versão de comparação</Label><select id="history-comparison" value={historyComparisonHash} onChange={event => setHistoryComparisonHash(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-[#d7e6e2] bg-white px-3 text-sm text-[#37575b]"><option value="">Selecione uma versão</option>{simulationHistory.map(version => <option key={version.bundle_sha256} value={version.bundle_sha256}>{version.scenario_id} · {new Date(version.exported_at_utc).toLocaleString("pt-BR")}</option>)}</select></div></div>{historyComparison.base && historyComparison.comparison ? historyComparison.rows.length === 0 ? <p className="mt-5 rounded-lg bg-[#f8fbfa] px-4 py-3 text-xs text-[#70878b]">As versões selecionadas não contêm exposições consolidadas.</p> : <div className="mt-5 overflow-hidden rounded-xl border border-[#e0ebe8]"><div className="grid grid-cols-4 bg-[#f8fbfa] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[.1em] text-[#70888d]"><span>Moeda</span><span className="text-right">Base</span><span className="text-right">Comparação</span><span className="text-right">Variação</span></div>{historyComparison.rows.map(row => <div key={row.currency} className="grid grid-cols-4 border-t border-[#edf3f1] px-4 py-3 text-xs"><span className="font-mono font-semibold text-[#37585a]">{row.currency}</span><span className="text-right font-mono text-[#5e777c]">{formatMoney(row.base, row.currency)}</span><span className="text-right font-mono text-[#5e777c]">{formatMoney(row.comparison, row.currency)}</span><span className={`text-right font-mono font-semibold ${row.comparison - row.base === 0 ? "text-[#52776f]" : "text-[#aa632e]"}`}>{formatMoney(row.comparison - row.base, row.currency)}</span></div>)}</div> : <p className="mt-5 rounded-lg border border-dashed border-[#d9e7e3] px-4 py-3 text-xs text-[#71888d]">Selecione duas versões armazenadas para comparar as exposições econômicas por moeda.</p>}</CardContent></Card>

    <div className={`mt-7 grid gap-6 2xl:grid-cols-[1.36fr_.92fr] ${panelClass("market")}`}>
      <Card className="rounded-2xl border-[#dce8e5] bg-white shadow-[0_22px_45px_-38px_rgba(16,58,58,.4)]"><CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-[#edf2f0] pb-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6c8990]">Curva de referência</p><CardTitle className="mt-1 text-base text-[#17363e]">ETTJ ANBIMA</CardTitle></div><Button variant="outline" size="sm" onClick={() => ettj.refetch()} disabled={ettj.isFetching} className="border-[#d8e5e2] text-[#42636b]"><RefreshCw className={ettj.isFetching ? "animate-spin" : ""} /> Atualizar</Button></CardHeader><CardContent className="p-4 sm:p-6">{ettj.isError ? <div className="grid h-[270px] place-items-center text-center"><CircleAlert className="h-6 w-6 text-[#c98542]" /><p className="mt-3 max-w-sm text-sm text-[#6d8086]">A curva não pôde ser recuperada. Nenhuma taxa de fallback foi aplicada.</p></div> : ettj.isLoading ? <div className="grid h-[270px] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-[#277e73]" /></div> : <div className="h-[270px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={curve} margin={{ top: 10, right: 12, bottom: 0, left: -18 }}><defs><linearGradient id="preCurve" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#31a98f" stopOpacity={0.28} /><stop offset="100%" stopColor="#31a98f" stopOpacity={0} /></linearGradient></defs><XAxis dataKey="vertex" tickLine={false} axisLine={false} tick={{ fill: "#769097", fontSize: 10 }} tickFormatter={value => `${value} du`} minTickGap={36} /><YAxis tickLine={false} axisLine={false} tick={{ fill: "#769097", fontSize: 10 }} tickFormatter={value => `${value}%`} /><Tooltip formatter={value => { const numericValue = typeof value === "number" ? value : Number(value); return Number.isFinite(numericValue) ? `${formatNumber(numericValue)}%` : "—"; }} labelFormatter={label => `${label} dias úteis`} contentStyle={{ borderRadius: 12, border: "1px solid #dce8e5" }} /><Area type="monotone" dataKey="pre" name="ETTJ PRE" stroke="#1a8c78" strokeWidth={2.25} fill="url(#preCurve)" /></AreaChart></ResponsiveContainer></div>}<div className="mt-3 flex flex-wrap gap-4 text-[11px] text-[#70888e]"><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-[#1a8c78]" />ETTJ PRE</span><span>unidade oficial: %a.a./252</span><span>fonte: ANBIMA</span></div></CardContent></Card>
      <Card className="rounded-2xl border-[#dce8e5] bg-white shadow-[0_22px_45px_-38px_rgba(16,58,58,.4)]"><CardHeader className="border-b border-[#edf2f0] pb-4"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6c8990]">Origem e cobertura</p><CardTitle className="mt-1 text-base text-[#17363e]">Fontes da sessão</CardTitle></CardHeader><CardContent className="space-y-2.5 p-4 sm:p-5"><SourceChip label="BCB / PTAX" detail={ptax.isError ? "Consulta oficial não concluída" : ptaxUnavailable ? "Cotação não publicada para a data-base" : ptax.data ? `${ptax.data.lineage.sourceAsOf} • hash calculado` : "Aguardando consulta"} status={ptax.isError ? "error" : ptaxUnavailable ? "unavailable" : ptax.data ? "loaded" : "pending"} action={() => ptax.refetch()} spinning={ptax.isFetching} /><SourceChip label="IBGE / IPCA" detail={ipca.isError ? "Competência indisponível" : ipca.data ? `${ipcaPeriod} • tabela 1737` : "Aguardando consulta"} status={ipca.isError ? "error" : ipca.data ? "loaded" : "pending"} action={() => ipca.refetch()} spinning={ipca.isFetching} /><SourceChip label="ANBIMA / ETTJ" detail={ettj.isError ? "Curva não recuperada" : ettj.data ? `${ettj.data.lineage.sourceAsOf} • %a.a./252` : "Aguardando consulta"} status={ettj.isError ? "error" : ettj.data ? "loaded" : "pending"} action={() => ettj.refetch()} spinning={ettj.isFetching} /><SourceChip label="FGV / IGP-M" detail={igpm.isError ? "Publicação não validada" : igpm.data ? `${igpm.data.dataframe.length} competência(s) recuperada(s)` : "Exceção autorizada • publicação oficial"} status={igpm.isError ? "error" : igpm.data ? "loaded" : "pending"} action={() => igpm.refetch()} spinning={igpm.isFetching} /><SourceChip label="B3 / Instrumentos" detail={manualB3Lineage.some(row => row.source_file.includes("BVBG.028.02")) ? "BVBG.028.02 oficial carregado nesta sessão" : "Cadastro BVBG.028.02 aguardando arquivo oficial"} status={manualB3Lineage.some(row => row.source_file.includes("BVBG.028.02")) ? "loaded" : "pending"} /></CardContent></Card>
    </div>

    <div id="hedge-section-exposures" className={`mt-7 scroll-mt-28 grid gap-6 xl:grid-cols-[1.05fr_.95fr] ${panelClass("exposures")}`}>
      <Card className="rounded-2xl border-[#c6ddd7] bg-white text-[#17363e] shadow-[0_22px_45px_-38px_rgba(16,58,58,.4)]"><CardHeader className="border-b border-[#dce8e5] pb-4"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#456970]">Exposição econômica</p><CardTitle className="mt-1 text-base text-[#17363e]">Adicionar ao DataFrame</CardTitle></CardHeader><CardContent className="p-5"><div className="grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><Label htmlFor="description" className="font-semibold text-[#294a50]">Descrição</Label><Textarea id="description" value={description} onChange={event => setDescription(event.target.value)} placeholder="Ex.: pagamento de importação" className="mt-1.5 min-h-[70px] border-[#9fbbb5] bg-white text-[#17363e] placeholder:text-[#58747a]" /></div><div><Label htmlFor="currency" className="font-semibold text-[#294a50]">Moeda</Label><Input id="currency" value={currency} maxLength={3} onChange={event => setCurrency(event.target.value.toUpperCase())} className="mt-1.5 border-[#9fbbb5] bg-white font-mono text-[#17363e] placeholder:text-[#58747a]" /></div><div><Label htmlFor="notional" className="font-semibold text-[#294a50]">Valor nocional</Label><Input id="notional" inputMode="decimal" value={notional} onChange={event => setNotional(event.target.value)} placeholder="0,00" className="mt-1.5 border-[#9fbbb5] bg-white text-[#17363e] placeholder:text-[#58747a]" /></div><div><Label htmlFor="cashflow" className="font-semibold text-[#294a50]">Data do fluxo</Label><Input id="cashflow" type="date" value={cashflowDate} onChange={event => setCashflowDate(event.target.value)} className="mt-1.5 border-[#9fbbb5] bg-white text-[#17363e]" /></div><div><Label htmlFor="direction" className="font-semibold text-[#294a50]">Direção econômica</Label><select id="direction" value={direction} onChange={event => setDirection(event.target.value as Exposure["direction"])} className="mt-1.5 h-9 w-full rounded-md border border-[#9fbbb5] bg-white px-3 text-sm font-medium text-[#17363e]"><option value="PAYABLE">Pagável</option><option value="RECEIVABLE">Recebível</option></select></div></div><Button onClick={addExposure} className="mt-5 bg-[#173c45] text-white hover:bg-[#24515a]"><Plus /> Adicionar exposição</Button></CardContent></Card>
      <Card className="rounded-2xl border-[#c6ddd7] bg-white text-[#17363e] shadow-[0_22px_45px_-38px_rgba(16,58,58,.4)]"><CardHeader className="flex flex-row items-center justify-between border-b border-[#dce8e5] pb-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#456970]">DataFrames ativos</p><CardTitle className="mt-1 text-base text-[#17363e]">Exposições da sessão</CardTitle></div><WalletCards className="h-5 w-5 text-[#20725f]" /></CardHeader><CardContent className="p-0"><p data-testid="session-dataframe-counts" className="border-b border-[#dce8e5] px-5 py-3 text-[10px] font-semibold uppercase tracking-[.1em] text-[#456970]">{instrumentMasterRows.length} instrumentos · {hedgeRows.length} hedges · {scenarioRows.length} cenários · {calculationRows.length} cálculos</p>{exposures.length === 0 ? <div className="px-6 py-12 text-center"><Landmark className="mx-auto h-7 w-7 text-[#4c8379]" /><p className="mt-3 text-sm font-semibold text-[#294a50]">Nenhuma exposição adicionada</p><p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-[#4d6d72]">Os cálculos permanecem bloqueados até a carga de exposição e de preços B3 validados.</p></div> : <div className="divide-y divide-[#dce8e5]">{exposures.map(exposure => <div key={exposure.exposure_id} className="flex items-center justify-between gap-4 px-5 py-4"><div className="min-w-0"><p className="truncate text-sm font-semibold text-[#17363e]">{exposure.description}</p><p className="mt-1 text-xs font-medium text-[#4d6d72]">{exposure.direction === "PAYABLE" ? "Pagável" : "Recebível"} • fluxo {exposure.cashflow_date}</p></div><div className="flex items-center gap-3"><div className="text-right">{exposure.exposureClass === "PHYSICAL_COMMODITY" ? <><p className="font-mono text-sm font-semibold text-[#17363e]">{formatNumber(exposure.physicalQuantity ?? 0)} {exposure.physicalUnit}</p><p className="mt-1 text-[10px] font-semibold uppercase tracking-[.12em] text-[#4d6d72]">Quantidade física • {exposure.commodityReference}</p></> : <><p className="font-mono text-sm font-semibold text-[#17363e]">{formatMoney(exposure.notional, exposure.currency)}</p><p className="mt-1 text-[10px] font-semibold uppercase tracking-[.12em] text-[#4d6d72]">{exposure.currency}</p></>}</div><button onClick={() => removeExposure(exposure.exposure_id)} aria-label={`Remover ${exposure.description}`} className="rounded-lg p-2 text-[#9b6846] transition hover:bg-[#fff4e8] hover:text-[#934a20]"><Trash2 className="h-4 w-4" /></button></div></div>)}</div>}</CardContent></Card>
    </div>

    <Card id="hedge-section-dataframes" data-testid="session-restored-dataframes" className={`mt-7 scroll-mt-28 rounded-2xl border-[#dce8e5] bg-[#fbfdfc] shadow-none ${panelClass("dataframes")}`}><CardHeader className="border-b border-[#edf2f0] pb-4"><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#6c8990]">Reconciliação de sessão</p><CardTitle className="mt-1 text-base text-[#17363e]">DataFrames restaurados e vinculados</CardTitle><p className="mt-2 text-xs leading-5 text-[#71878e]">A lista exibe identificadores das linhas já presentes na sessão. Ela não reprecifica instrumentos, nem transforma especificações de produto em séries B3.</p></CardHeader><CardContent className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4"><div data-testid="restored-instrument-master-panel" className="rounded-xl border border-[#dce8e5] bg-white p-3"><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#6c8990]">Instrument Master</p><p className="mt-1 text-sm font-semibold text-[#17363e]">{instrumentMasterRows.length} linha(s)</p><p className="mt-2 break-words font-mono text-[11px] text-[#567078]">{instrumentMasterRows.slice(0, 3).map(row => row.instrument_id).join(" · ") || "Nenhuma linha restaurada"}</p></div><div data-testid="restored-hedge-panel" className="rounded-xl border border-[#dce8e5] bg-white p-3"><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#6c8990]">Hedges</p><p className="mt-1 text-sm font-semibold text-[#17363e]">{hedgeRows.length} linha(s)</p><p className="mt-2 break-words font-mono text-[11px] text-[#567078]">{hedgeRows.slice(0, 3).map(row => row.hedge_id).join(" · ") || "Nenhuma linha restaurada"}</p></div><div data-testid="restored-scenario-panel" className="rounded-xl border border-[#dce8e5] bg-white p-3"><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#6c8990]">Cenários</p><p className="mt-1 text-sm font-semibold text-[#17363e]">{scenarioRows.length} linha(s)</p><p className="mt-2 break-words font-mono text-[11px] text-[#567078]">{scenarioRows.slice(0, 3).map(row => row.scenario_id).join(" · ") || "Nenhuma linha restaurada"}</p></div><div data-testid="restored-calculation-panel" className="rounded-xl border border-[#dce8e5] bg-white p-3"><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#6c8990]">Cálculos</p><p className="mt-1 text-sm font-semibold text-[#17363e]">{calculationRows.length} linha(s)</p><p className="mt-2 break-words font-mono text-[11px] text-[#567078]">{calculationRows.slice(0, 3).map(row => row.calculation_id).join(" · ") || "Nenhuma linha restaurada"}</p></div></CardContent></Card>

    <div className={`mt-7 grid gap-6 xl:grid-cols-2 ${panelClass("market")} `}>
      <BusinessDayCalculatorCard />
      <Card className="rounded-2xl border-[#dce8e5] bg-[#f8fbfa] shadow-none"><CardContent className="p-6"><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#6c8990]">Regra de uso</p><h3 className="mt-2 text-base font-semibold text-[#17363e]">O calendário é parte da linhagem</h3><p className="mt-3 text-sm leading-6 text-[#607a76]">A B3 e a ANBIMA podem divergir em determinados dias. Por isso, o cálculo nunca escolhe o calendário automaticamente: o módulo quantitativo deverá carregar a origem adequada ao instrumento e registrar essa escolha na memória de cálculo.</p><p className="mt-4 text-xs leading-5 text-[#758e94]">Cobertura atualmente validada: 2026. Datas de outros anos permanecem bloqueadas até a coleta da fonte oficial correspondente.</p></CardContent></Card>
    </div>

    <div id="hedge-section-market-data" className={`scroll-mt-28 ${panelClass("market")}`}><B3RealPipelineCard />

    <B3InstrumentMasterSelector onSelected={receiveB3Specification} />

    <B3ManualCollectionCard onLineage={setManualB3Lineage} onNormalizations={setB3NormalizedArtifacts} autoCollect />

    <B3ObservationSelector artifacts={b3NormalizedArtifacts} dataframes={canonicalDataframes} onSelected={receiveB3ObservationSelection} />

    <B3DiFutureCurveCard onCurve={setDiCurveReference} visualLoading={di1VisualLoading} />

    <DiCurveReferenceStatusCard curve={diCurveReference} />

    <OfficialManualCollectionCard />

    <BcbSelicSgsCard />

    <BcbSelicAnnualized252Card />

    <IpcaAccumulationCard onSnapshot={recordSessionSnapshot} />

    <SelicOverAccumulationCard onSnapshot={recordSessionSnapshot} /></div>

    <div className={panelClass("exposures")}><ExposureMaturityBucketsCard exposures={exposures} />

    <CdiDebtCoverageSummaryCard dataframes={canonicalDataframes} /></div>

    <div id="hedge-section-exposures-guided" className={`scroll-mt-28 ${requestedPanel === "exposures" ? "" : "hidden"}`}><div className="mb-5 rounded-2xl border border-[#cde4dd] bg-[#f2fbf7] px-5 py-4"><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#277161]">Jornada de análise</p><p className="mt-1 text-sm font-semibold text-[#17363e]">1. Declare o risco econômico · 2. Veja as alternativas compatíveis · 3. Escolha uma para estudar</p><p className="mt-1 text-xs leading-5 text-[#55736d]">A operação é configurada a partir da exposição declarada. Série, preço e contrato só entram quando houver evidência compatível; a análise didática não fica parada aguardando a fonte.</p></div><HedgeDiagnosisCard onCanonicalDataframes={receiveCanonicalDiagnosis} onRegistered={receiveGuidedExposure} /><EligibleAlternativesComparisonCard dataframes={canonicalDataframes} lineage={sourceLineage} selectedAlternativeId={selectedAlternativeId} onSelectAlternative={alternativeId => { setSelectedAlternativeId(alternativeId); setAnalysisCoveragePct(100); }} diCurve={diCurveReference} onDiCurve={setDiCurveReference} diCurveAsOf={lastWeekday()} coveragePct={analysisCoveragePct} onCoverageChange={setAnalysisCoveragePct} onOpenSimulation={() => setLocation("/cenarios")} b3Catalog={b3ContractCatalog} /><ExposureMaturityBucketsCard exposures={exposures} /><CdiDebtCoverageSummaryCard dataframes={canonicalDataframes} /></div>

    <div id="hedge-section-scenarios" className={`scroll-mt-28 ${panelClass("scenarios")}`}><Card className="rounded-2xl border-[#cce4dd] bg-[#f2fbf7] shadow-none"><CardContent className="p-5"><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#287465]">Etapa 3 · testar e decidir</p><h2 className="mt-1 text-lg font-semibold text-[#17363e]">Compare a operação configurada com o risco sem proteção</h2><p className="mt-2 max-w-3xl text-xs leading-5 text-[#55736d]">A exposição, o horizonte e a direção já vêm da operação escolhida. Nesta etapa entram apenas hipóteses de cenário e cobertura. Cotação B3 observada e hipótese didática são mostradas separadamente.</p></CardContent></Card>{!selectedAlternative ? <Card className="mt-5 rounded-2xl border-[#dce8e5] bg-white shadow-none"><CardContent className="p-7 text-center"><p className="text-sm font-semibold text-[#284a4c]">Nenhuma alternativa está em análise</p><p className="mx-auto mt-2 max-w-lg text-xs leading-5 text-[#637d79]">Declare uma exposição e selecione uma alternativa de hedge para abrir a operação e o caminho de simulação correspondente.</p><Button onClick={() => setLocation("/exposicoes")} className="mt-4 bg-[#1b6258] text-white hover:bg-[#164e46]">Voltar para exposições</Button></CardContent></Card> : <><Card className="mt-5 rounded-2xl border-[#d5e8e2] bg-white shadow-none"><CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#367a6c]">Operação em análise</p><p className="mt-1 text-base font-semibold text-[#17363e]">{selectedAlternative.label}</p><p className="mt-1 text-xs leading-5 text-[#5a7773]">{selectedAlternativeNeedsB3 ? "A evidência B3 será usada somente quando série, vencimento e data-base estiverem confirmados. A análise didática não aguarda essa coleta." : "Use os parâmetros e documentos contratuais declarados; não há dado B3 implícito neste caminho."}</p></div><Button variant="outline" onClick={() => setLocation("/exposicoes")} className="border-[#bcd9d1] bg-white text-[#1c6157] hover:bg-[#edf9f5]">Trocar alternativa</Button></CardContent></Card>{selectedSituation && <HedgeOperationCard situation={selectedSituation} alternative={selectedAlternative} diCurve={diCurveReference} commodityMarketStatus={commodityMarketLink.alternativeId === selectedAlternativeId ? commodityMarketLink.status : "idle"} commodityMarketObservation={commodityMarketLink.alternativeId === selectedAlternativeId ? commodityMarketLink.observation : null} catalogObservation={selectedCatalogObservation as any} onLinkCommodityMarket={linkCommodityMarket} coveragePct={analysisCoveragePct} onCoverageChange={setAnalysisCoveragePct} compact />}{selectedAlternative?.alternative_kind === "OTC_NDF_OR_TERM" && selectedSituation && <NdfSettlementCard key={`main-ndf-${selectedAlternativeId}`} ptaxSale={ptaxQuote?.cotacaoVenda} ptaxLineage={ptax.data?.lineage} ettjLineage={ettj.data?.lineage} initialNotionalUsd={selectedSituation.declared_quantity} initialDirection={selectedSituation.situation_kind === "USD_RECEIVABLE" ? "SELL_USD" : "BUY_USD"} onSessionSnapshot={receiveNdfSnapshot} />} {selectedAlternative?.alternative_kind === "OTC_FX_SWAP" && <FxSwapScenarioCard key={`main-swap-${selectedAlternativeId}`} instrumentMasterRows={instrumentMasterRows} hedgeRows={hedgeRows} onSnapshot={recordSessionSnapshot} />} {selectedAlternativeIsCdiDi1 && selectedSituation ? <CdiDebtStressScenarioCard situation={selectedSituation} alternative={selectedAlternative} curve={diCurveReference} onOpenAdvanced={() => setAdvancedToolsOpen(true)} /> : selectedSituation?.commodity_reference ? <CommodityStrategyComparatorCard situation={selectedSituation} alternative={selectedAlternative} coveragePct={analysisCoveragePct} onCoverageChange={setAnalysisCoveragePct} /> : <LinearFuturesScenarioCard key={selectedAlternativeId} onSnapshot={recordSessionSnapshot} situation={selectedSituation} alternative={selectedAlternative} observedPrice={selectedCommodityMarketObservation?.lastPrice ?? selectedCommodityMarketObservation?.adjustedQuote ?? null} observedSourceAsOf={selectedCommodityMarketObservation?.sourceAsOf ?? null} observedSourceFile={selectedCommodityMarketObservation ? "B3_PRICE_REPORT" : null} observedSourceHashSha256={selectedCommodityMarketObservation?.sourceHashSha256 ?? null} coveragePct={analysisCoveragePct} />}</>}{selectedSituation && <HedgeAlternativeDecisionMatrixCard dataframes={canonicalDataframes} selectedAlternativeId={selectedAlternativeId} coveragePct={analysisCoveragePct} b3Catalog={b3ContractCatalog} />}<details open={advancedToolsOpen} onToggle={event => setAdvancedToolsOpen(event.currentTarget.open)} className="mt-7 rounded-2xl border border-[#dce8e5] bg-white"><summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-[#284a4c]"><span className="mr-2 text-[#2f806d]">+</span> Detalhes técnicos e contratuais</summary><div className="border-t border-[#e8f0ed] px-5 pb-5"><p className="mt-4 text-xs leading-5 text-[#667f7b]">Abra esta área somente depois da decisão de cenário. Ela concentra ajustes, contratos e dimensionamentos que exigem posição contratada, série B3 ou documento bilateral; não é necessária para iniciar a análise.</p><Di1VariationMarginCard onSnapshot={recordSessionSnapshot} curveReference={diCurveReference} /><B3FxFutureDailySettlementCard onSnapshot={recordSessionSnapshot} /><B3DollarOptionIntrinsicSettlementCard onSnapshot={recordSessionSnapshot} /><B3DollarOptionPremiumMtmGreeksCard onSnapshot={recordSessionSnapshot} /><B3CornOptionIntrinsicSettlementCard onSnapshot={recordSessionSnapshot} /><B3CornOptionPremiumMtmGreeksCard onSnapshot={recordSessionSnapshot} /><B3CattleOptionIntrinsicSettlementCard onSnapshot={recordSessionSnapshot} /><B3CattleOptionPremiumMtmGreeksCard onSnapshot={recordSessionSnapshot} /><B3SoyOptionIntrinsicSettlementCard onSnapshot={recordSessionSnapshot} /><B3SoyOptionPremiumMtmGreeksCard onSnapshot={recordSessionSnapshot} /><B3SjcOptionIntrinsicSettlementCard onSnapshot={recordSessionSnapshot} /><B3SjcOptionPremiumMtmGreeksCard onSnapshot={recordSessionSnapshot} /><Di1OptionContractReferenceCard dataframes={canonicalDataframes} instrumentMasterRows={instrumentMasterRows} onSnapshot={recordSessionSnapshot} /><FraDi1StructureReferenceCard dataframes={canonicalDataframes} onSnapshot={recordSessionSnapshot} /><ScenarioStrategyComparisonCard scenarios={scenarioRows} calculations={calculationRows} /><CurrentScenarioComparisonCard scenarios={scenarioRows} calculations={calculationRows} lineage={sourceLineage} /><FxFutureSizer exposures={exposures} onSizing={receiveFxFutureSizing} /><FxOptionSizer dataframes={canonicalDataframes} instrumentMasterRows={instrumentMasterRows} onSizing={receiveFxOptionSizing} /><CommodityFutureSizer dataframes={canonicalDataframes} instrumentMasterRows={instrumentMasterRows} onSizing={receiveCommodityFutureSizing} /><CommodityOptionSizer dataframes={canonicalDataframes} instrumentMasterRows={instrumentMasterRows} onSizing={receiveCommodityOptionSizing} /><FxScenarioLab exposures={exposures} ptaxSale={ptaxQuote?.cotacaoVenda} onSessionSnapshot={receiveFxScenarioSnapshot} /><NdfSettlementCard ptaxSale={ptaxQuote?.cotacaoVenda} ptaxLineage={ptax.data?.lineage} ettjLineage={ettj.data?.lineage} onSessionSnapshot={receiveNdfSnapshot} /><OtcContractMasterCard onMasterCreated={receiveOtcMaster} onHedgeCreated={receiveOtcHedge} exposures={exposures.map(exposure => ({ exposure_id: exposure.exposure_id, description: exposure.description }))} /><FxSwapScenarioCard instrumentMasterRows={instrumentMasterRows} hedgeRows={hedgeRows} onSnapshot={recordSessionSnapshot} /><HedgeEffectivenessCard valuationAsOf={ptax.data?.lineage.sourceAsOf ?? ettj.data?.lineage.sourceAsOf} sourceIds={sourceLineage.map(item => item.source_id)} onSessionSnapshot={receiveEffectivenessSnapshot} /><ResidualRiskCard valuationAsOf={ptax.data?.lineage.sourceAsOf ?? ettj.data?.lineage.sourceAsOf} sourceIds={sourceLineage.map(item => item.source_id)} onSessionSnapshot={receiveResidualRiskSnapshot} /></div></details></div>

    <div className={panelClass("history")}><ScenarioBundleComparator /></div>

    <Card id="hedge-section-reports" className={`mt-7 scroll-mt-28 rounded-2xl border-[#dce8e5] bg-white shadow-none ${panelClass("reports")}`}><CardHeader className="border-b border-[#edf2f0] pb-4"><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#6c8990]">Relatórios auditáveis</p><CardTitle className="mt-1 text-base text-[#17363e]">Exportar memória de cálculo da sessão</CardTitle><p className="mt-2 text-xs leading-5 text-[#71878e]">O PDF registra exposições, fontes, hashes, memória de cálculo e limitações que existirem na sessão atual.</p></CardHeader><CardContent className="p-5"><Button onClick={() => downloadAuditPdf({ scenarioId: scenarioRows.map(row => row.scenario_id).join("+") || `sessao-${new Date().toISOString().replace(/[:.]/g, "-")}`, exposures, lineage: sourceLineage, calculationMemory: auditCalculationMemory.length ? auditCalculationMemory : undefined, limitations: auditLimitations })} className="bg-[#173c45] text-white hover:bg-[#24515a]"><FileJson2 /> Gerar relatório PDF</Button></CardContent></Card>

    <Card className={`mt-5 rounded-2xl border-[#cfe2dd] bg-[#f8fcfa] shadow-none ${panelClass("reports")}`}><CardHeader className="border-b border-[#e3efeb] pb-4"><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#3d786d]">Módulo final · intercâmbio de sessão</p><CardTitle className="mt-1 text-base text-[#17363e]">Salvar, restaurar ou compartilhar evidências</CardTitle><p className="mt-2 text-xs leading-5 text-[#527078]">Use estes arquivos apenas ao finalizar ou retomar um exercício. Eles não são necessários para cadastrar uma exposição, consultar fontes ou rodar cenários.</p></CardHeader><CardContent className="grid gap-3 p-5 md:grid-cols-3"><div className="rounded-xl border border-[#d3e4df] bg-white p-4"><p className="text-sm font-semibold text-[#17363e]">Pacote JSON</p><p className="mt-1 text-xs leading-5 text-[#547278]">Cópia legível da sessão completa, com DataFrames e hashes. Indicado para guardar ou restaurar um exercício.</p><div className="mt-4 flex gap-2"><Button size="sm" onClick={exportSession} disabled={createBundle.isPending} className="bg-[#1c6058] text-white hover:bg-[#164d47]">Exportar</Button><Button size="sm" variant="outline" onClick={() => jsonBundleInput.current?.click()} className="border-[#bcd8d0] text-[#1d6158]">Importar</Button></div></div><div className="rounded-xl border border-[#d3e4df] bg-white p-4"><p className="text-sm font-semibold text-[#17363e]">Parquet + manifesto</p><p className="mt-1 text-xs leading-5 text-[#547278]">Formato compacto para análise técnica, acompanhado de manifesto com integridade e linhagem.</p><div className="mt-4 flex gap-2"><Button size="sm" onClick={exportSessionParquet} disabled={exportParquetScenario.isPending} className="bg-[#1c6058] text-white hover:bg-[#164d47]">Exportar</Button><Button size="sm" variant="outline" onClick={() => parquetInput.current?.click()} className="border-[#bcd8d0] text-[#1d6158]">Importar</Button></div></div><div className="rounded-xl border border-[#d3e4df] bg-white p-4"><p className="text-sm font-semibold text-[#17363e]">CSV de exposições</p><p className="mt-1 text-xs leading-5 text-[#547278]">Tabela das exposições declaradas, sempre acompanhada por manifesto SHA-256 para conferência.</p><div className="mt-4 flex gap-2"><Button size="sm" onClick={exportExposureCsvArtifact} disabled={exposures.length === 0} className="bg-[#1c6058] text-white hover:bg-[#164d47]">Exportar</Button><Button size="sm" variant="outline" onClick={() => csvArtifactInput.current?.click()} className="border-[#bcd8d0] text-[#1d6158]">Importar</Button></div></div></CardContent></Card>

    <Card className={`mt-7 rounded-2xl border-[#eedfc8] bg-[#fffaf3] shadow-none ${panelClass("reports")}`}><CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#b16a26]" /><div><p className="text-sm font-semibold text-[#704313]">Resultados quantitativos permanecem condicionados aos insumos declarados.</p><p className="mt-1 text-xs leading-5 text-[#8d6c45]">O pipeline B3 validado habilita cenários e cálculos com linhagem. MTM completo, Greeks e risco residual consolidado continuam bloqueados quando faltarem preço, curva, contrato ou dados de volatilidade necessários.</p></div></div><div className="flex items-center gap-2 text-xs font-medium text-[#87613a]"><FileJson2 className="h-4 w-4" /> linhagem exportável</div></CardContent></Card>
  </section>;
}

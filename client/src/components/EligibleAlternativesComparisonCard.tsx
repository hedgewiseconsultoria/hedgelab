import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import HedgeOperationCard from "@/components/HedgeOperationCard";
import { Scale } from "lucide-react";
import React from "react";
import type { CanonicalHedgeDataframes } from "../../../server/domain/dataframes";
import type { DiFutureCurveDataset } from "../../../server/domain/diFutureCurve";

function assetLabel(alternative: CanonicalHedgeDataframes["hedge_alternative_dataframe"][number], situation: CanonicalHedgeDataframes["economic_situation_dataframe"][number] | undefined) {
  switch (alternative.alternative_kind) {
    case "B3_DOL_FUTURE": return "DOL · FUTURE · contrato futuro de dólar comercial";
    case "B3_WDO_FUTURE": return "WDO · FUTURE · mini contrato futuro de dólar";
    case "B3_DOL_OPTION": return "DOL · OPTION · opção sobre dólar comercial";
    case "B3_DI1_FUTURE": return "DI1 · FUTURE · contrato futuro de DI";
    case "B3_FRA_DI1": return "DI1 · FUTURE · FRA/DI com futuro-objeto";
    case "B3_DI1_OPTION": return "DI1 · OPTION/FUTURE · opção de DI e futuro-objeto";
    case "B3_COMMODITY_FUTURE": return `${situation?.commodity_reference ?? "B3"} · FUTURE · futuro de commodity`;
    case "B3_COMMODITY_OPTION": return `${situation?.commodity_reference ?? "B3"} · OPTION · opção de commodity`;
    default: return alternative.source_ids.includes("B3_PUBLIC_FILES") ? "B3 · instrumento oficial compatível" : "Contrato bilateral declarado";
  }
}

function statusText(status: "eligible_with_market_data" | "contract_required" | "blocked", hasObservation: boolean, hasSizing: boolean, hasResult: boolean) {
  if (status === "blocked") return "Bloqueada";
  if (hasResult) return "Resultado vinculado";
  if (hasSizing) return "Cobertura publicada";
  if (hasObservation) return "Série B3 vinculada";
  return status === "contract_required" ? "Exige contrato bilateral" : "Aguardando série e contrato";
}

/** Compara alternativas do catálogo por sua evidência e bloqueio, não por recomendação ou rentabilidade presumida. */
type LineageRow = { source_id: string; source_file: string; source_asof: string | null; source_hash_sha256: string | null };
type CatalogRow = { family: string; horizonDate: string; instrumentType?: string; associationStatus: string; issues: unknown[]; observations: Array<{ symbol: string; maturity: string | null; instrumentType: string; lastPrice: number | null; adjustedQuote: number | null }> };
function catalogFamily(alternative: CanonicalHedgeDataframes["hedge_alternative_dataframe"][number], situation: CanonicalHedgeDataframes["economic_situation_dataframe"][number] | undefined) {
  const kind = alternative.alternative_kind;
  if (kind.includes("DI1")) return "DI1";
  if (kind.includes("WDO")) return "WDO";
  if (kind.includes("DOL")) return "DOL";
  return situation?.commodity_reference ?? null;
}
type Props = {
  dataframes: CanonicalHedgeDataframes;
  lineage?: LineageRow[];
  selectedAlternativeId?: string | null;
  onSelectAlternative?: (alternativeId: string) => void;
  diCurve?: DiFutureCurveDataset | null;
  onDiCurve?: (curve: DiFutureCurveDataset | null) => void;
  diCurveAsOf?: string;
  onOpenSimulation?: () => void;
  coveragePct?: number;
  onCoverageChange?: (coverage: number) => void;
  b3Catalog?: CatalogRow[];
};

export default function EligibleAlternativesComparisonCard({ dataframes, lineage = [], selectedAlternativeId, onSelectAlternative, diCurve, onDiCurve, diCurveAsOf = "2026-08-13", onOpenSimulation, coveragePct = 100, onCoverageChange = () => {}, b3Catalog = [] }: Props) {
  const situation = dataframes.economic_situation_dataframe[0];
  const risk = dataframes.risk_factor_dataframe[0];
  const selectedAlternative = dataframes.hedge_alternative_dataframe.find(alternative => alternative.alternative_id === selectedAlternativeId);
  const selectedSituation = selectedAlternative ? dataframes.economic_situation_dataframe.find(item => item.economic_situation_id === selectedAlternative.economic_situation_id) : undefined;
  void onDiCurve;
  void diCurveAsOf;

  if (!situation || !risk) return <Card className="mt-7 rounded-2xl border-[#d7e7e2] bg-white shadow-none"><CardHeader className="border-b border-[#edf2f0] pb-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#6c8990]">Alternativas de hedge</p><CardTitle className="mt-1 text-base text-[#17363e]">Comparação condicionada à situação econômica</CardTitle></div><Scale className="h-5 w-5 text-[#328a7a]" /></div></CardHeader><CardContent className="px-5 py-7 text-center text-sm text-[#71878e]">Faça um diagnóstico de exposição para materializar alternativas e seus bloqueios quantitativos.</CardContent></Card>;

  return <><Card className="mt-7 rounded-2xl border-[#d7e7e2] bg-white shadow-none"><CardHeader className="border-b border-[#edf2f0] pb-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#6c8990]">Etapa 2 · alternativas declaradas</p><CardTitle className="mt-1 text-base text-[#17363e]">Como este risco pode ser protegido?</CardTitle></div><Scale className="h-5 w-5 text-[#328a7a]" /></div><p className="mt-2 text-xs leading-5 text-[#607a76]">A exposição <strong>{situation.description}</strong> está ligada ao fator <strong>{risk.risk_factor}</strong>. Escolha uma alternativa para configurar a operação com os dados já declarados. O sistema não cria contratos, preços ou recomendações.</p></CardHeader><CardContent className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">{dataframes.hedge_alternative_dataframe.map(alternative => {
    const sizing = dataframes.hedge_sizing_dataframe.find(row => row.alternative_id === alternative.alternative_id);
    const result = dataframes.scenario_result_dataframe.find(row => row.alternative_id === alternative.alternative_id);
    const coverage = sizing?.coverage_target_pct === null || sizing?.coverage_target_pct === undefined ? "Não dimensionada" : `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 4 }).format(sizing.coverage_target_pct)}%`;
    const selectedB3 = dataframes.b3_observation_link_dataframe?.find(item => item.alternative_id === alternative.alternative_id);
    const observedB3 = alternative.source_ids.includes("B3_PUBLIC_FILES") ? lineage.find(item => item.source_id === "B3_PUBLIC_FILES") : undefined;
    const active = selectedAlternativeId === alternative.alternative_id;
    const alternativeSituation = dataframes.economic_situation_dataframe.find(item => item.economic_situation_id === alternative.economic_situation_id);
    const family = catalogFamily(alternative, alternativeSituation);
    const catalog = family && alternativeSituation ? b3Catalog.find(item => item.family === family && item.horizonDate === alternativeSituation.horizon_date) : undefined;
    return <article key={alternative.alternative_id} className={`rounded-xl border p-4 transition ${active ? "border-[#4ca990] bg-[#effbf7] shadow-[0_12px_28px_-24px_rgba(20,94,82,.7)]" : "border-[#dce9e5] bg-[#fbfdfc]"}`}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-[#17363e]">{alternative.label}</p><p className="mt-1 text-[11px] text-[#54726c]">{alternative.hedge_direction === "BUY" ? "Proteção por posição comprada" : "Proteção por posição vendida"}</p></div><Badge variant="outline" className={active ? "border-[#8bd0bf] bg-white text-[10px] text-[#166657]" : "border-[#d7e7e2] bg-white text-[10px] text-[#466761]"}>{statusText(alternative.eligibility_status, Boolean(selectedB3), Boolean(sizing && sizing.sizing_status === "sized"), Boolean(result && result.result_status === "SUCCESS"))}</Badge></div><div className="mt-4 space-y-3 text-xs leading-5"><div><p className="text-[10px] font-semibold uppercase tracking-[.1em] text-[#6f8984]">Para utilizar</p><p className="mt-1 text-[#54726c]">{alternative.required_data.join(" · ")}</p></div><div><p className="text-[10px] font-semibold uppercase tracking-[.1em] text-[#6f8984]">Evidência atual</p><p className="mt-1 text-[#54726c]">{selectedB3 ? `${selectedB3.family} · ${selectedB3.symbol} · venc. ${selectedB3.maturity ?? "não informado"}` : observedB3 ? "Arquivo oficial B3 está na sessão; a série ainda não foi escolhida." : alternative.eligibility_status === "contract_required" ? "Exige contrato bilateral declarado e hasheado." : "Aguardando série, contrato ou dado oficial compatível."}</p></div><div><p className="text-[10px] font-semibold uppercase tracking-[.1em] text-[#6f8984]">Cobertura e cenário</p><p className="mt-1 font-medium text-[#315b53]">Ativo compatível: {assetLabel(alternative, dataframes.economic_situation_dataframe.find(item => item.economic_situation_id === alternative.economic_situation_id))}</p><p className="mt-1 text-[#54726c]">{selectedB3 ? `Série selecionada: ${selectedB3.symbol} · venc. ${selectedB3.maturity ?? "não informado"}` : catalog?.observations.length ? `Contratos compatíveis com ${alternativeSituation?.horizon_date}: ${catalog.observations.slice(0, 4).map(item => `${item.symbol} (${item.maturity ?? "vencimento não informado"}${item.lastPrice !== null || item.adjustedQuote !== null ? ` · ${item.lastPrice ?? item.adjustedQuote}` : " · preço indisponível"})`).join(" · ")}` : catalog ? "Nenhum contrato com associação e preço oficial para este horizonte; cálculo bloqueado." : alternative.source_ids.includes("B3_PUBLIC_FILES") ? "Catálogo B3 sendo carregado automaticamente para o horizonte declarado." : "Termos e contrato precisam ser declarados."}</p><p className="mt-1 text-[#54726c]">{coverage}{result?.economic_result === null || result?.economic_result === undefined ? " · cenário ainda não calculado" : ` · resultado ${result.economic_result} ${result.result_currency ?? ""}`}</p>{result?.limitation && <p className="mt-1 text-[10px] leading-4 text-[#71858a]">{result.limitation}</p>}</div></div><button type="button" onClick={() => onSelectAlternative?.(alternative.alternative_id)} className={`mt-4 w-full rounded-lg px-3 py-2 text-xs font-semibold transition ${active ? "bg-[#1b6258] text-white hover:bg-[#164e46]" : "border border-[#bcd9d1] bg-white text-[#1b6157] hover:bg-[#edf9f5]"}`}>{active ? "Alternativa em análise" : "Analisar esta alternativa"}</button><p className="mt-3 text-[10px] leading-4 text-[#8d6740]">{sizing?.blocking_reason ?? alternative.blocking_reason ?? "Antes do dimensionamento, valide os parâmetros e as evidências exigidas."}</p></article>;
  })}</CardContent></Card>{selectedAlternative && selectedSituation && <HedgeOperationCard situation={selectedSituation} alternative={selectedAlternative} diCurve={diCurve} coveragePct={coveragePct} onCoverageChange={onCoverageChange} onOpenSimulation={onOpenSimulation} />}</>;
}

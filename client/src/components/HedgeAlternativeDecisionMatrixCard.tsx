import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, CircleAlert, Scale } from "lucide-react";
import type { CanonicalHedgeDataframes } from "../../../server/domain/dataframes";
import { calculateHedgeOperationSizing, type HedgeOperationCatalogObservation } from "../../../server/domain/hedgeOperationSizing";

type CatalogRow = { family: string; horizonDate: string; associationStatus: string; issues: unknown[]; observations: Array<HedgeOperationCatalogObservation & { marginCurrency?: string | null; marginSourceFile?: string | null; marginSourceHashSha256?: string | null }> };
type Props = {
  dataframes: CanonicalHedgeDataframes;
  selectedAlternativeId?: string | null;
  coveragePct: number;
  b3Catalog?: CatalogRow[];
};
function catalogFamily(alternative: CanonicalHedgeDataframes["hedge_alternative_dataframe"][number], situation: CanonicalHedgeDataframes["economic_situation_dataframe"][number]) {
  const kind = alternative.alternative_kind;
  if (kind.includes("DI1")) return "DI1";
  if (kind.includes("WDO")) return "WDO";
  if (kind.includes("DOL")) return "DOL";
  return situation.commodity_reference ?? null;
}

function status(alternative: CanonicalHedgeDataframes["hedge_alternative_dataframe"][number], hasLink: boolean, hasCatalog: boolean, catalogBlocked: boolean, result?: CanonicalHedgeDataframes["scenario_result_dataframe"][number]) {
  if (result?.result_status === "SUCCESS") return { label: "Resultado disponível", tone: "ok" };
  if (hasLink) return { label: "Série vinculada; cálculo pendente", tone: "ok" };
  if (hasCatalog) return { label: "Contrato compatível encontrado", tone: "ok" };
  if (catalogBlocked) return { label: "Catálogo B3 bloqueado", tone: "warn" };
  if (alternative.eligibility_status === "contract_required") return { label: "Contrato necessário", tone: "warn" };
  if (alternative.eligibility_status === "blocked") return { label: "Bloqueada", tone: "warn" };
  return { label: "Ativo elegível; série pendente", tone: "warn" };
}

/** Compara a mesma exposição sem misturar ausência de evidência com resultado econômico. */
export default function HedgeAlternativeDecisionMatrixCard({ dataframes, selectedAlternativeId, coveragePct, b3Catalog = [] }: Props) {
  const situation = dataframes.economic_situation_dataframe[0];
  if (!situation || !dataframes.hedge_alternative_dataframe.length) return null;
  return <Card className="mt-7 rounded-2xl border-[#cfe3dd] bg-white shadow-none">
    <CardHeader className="border-b border-[#e5efec] pb-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#3a786b]">Comparação da mesma exposição</p><CardTitle className="mt-1 text-base text-[#17363e]">Alternativas disponíveis para {situation.description}</CardTitle><p className="mt-2 text-xs leading-5 text-[#607a76]">Todas as linhas usam o mesmo horizonte e a mesma meta de cobertura de {coveragePct}%. Um resultado numérico só aparece quando houver contrato, série e evidência válidos.</p></div><Scale className="h-5 w-5 text-[#328a7a]" /></div></CardHeader>
    <CardContent className="p-5"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead><tr className="border-b border-[#dceae6] text-[10px] uppercase tracking-[.1em] text-[#6b8780]"><th className="px-3 py-2">Alternativa</th><th className="px-3 py-2">Ativo / contrato</th><th className="px-3 py-2">Quantidade / cobertura</th><th className="px-3 py-2">Preço / margem</th><th className="px-3 py-2">Evidência</th><th className="px-3 py-2">Estado</th></tr></thead><tbody>{dataframes.hedge_alternative_dataframe.map(alternative => {
      const link = dataframes.b3_observation_link_dataframe?.find(row => row.alternative_id === alternative.alternative_id);
      const result = dataframes.scenario_result_dataframe.find(row => row.alternative_id === alternative.alternative_id);
      const situationForAlternative = dataframes.economic_situation_dataframe.find(item => item.economic_situation_id === alternative.economic_situation_id) ?? situation;
      const family = catalogFamily(alternative, situationForAlternative);
      const catalog = family ? b3Catalog.find(item => item.family === family && item.horizonDate === situationForAlternative.horizon_date) : undefined;
      const catalogBlocked = Boolean(catalog && catalog.associationStatus.startsWith("blocked"));
      const current = status(alternative, Boolean(link), Boolean(catalog?.observations.length), catalogBlocked, result);
      const candidate = catalog?.observations[0] ?? null;
      const sizing = calculateHedgeOperationSizing({ situation: situationForAlternative, alternative, coveragePct, observation: candidate, marginTheoreticalMax: candidate?.marginTheoreticalMax ?? null });
      const number = (value: number | null) => value === null ? "—" : new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 4 }).format(value);
      const moneyValue = (value: number | null) => value === null ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }).format(value);
      const issueMessage = catalog?.issues.find(issue => typeof issue === "object" && issue !== null && "message" in issue && typeof issue.message === "string") as { message: string } | undefined;
      return <tr key={alternative.alternative_id} className={`border-b border-[#edf3f1] ${selectedAlternativeId === alternative.alternative_id ? "bg-[#f0faf6]" : ""}`}><td className="px-3 py-3 font-semibold text-[#23474a]">{selectedAlternativeId === alternative.alternative_id ? "Em análise · " : ""}{alternative.label}</td><td className="px-3 py-3 text-[#55736d]">{link ? `${link.symbol} · venc. ${link.maturity ?? "não informado"}` : catalog?.observations.length ? catalog.observations.slice(0, 3).map(item => `${item.symbol} · ${item.maturity ?? "vencimento não informado"}${item.lastPrice !== null || item.adjustedQuote !== null ? ` · preço ${item.lastPrice ?? item.adjustedQuote}` : " · preço indisponível"}`).join(" | ") : catalogBlocked ? "Sem catálogo compacto verificado; cálculo efetivo bloqueado" : alternative.required_data.join(" · ")}</td><td className="px-3 py-3 text-[#55736d]">{sizing.contracts === null ? alternative.source_ids.includes("B3_PUBLIC_FILES") ? "Bloqueado" : "Declarar termos" : `${number(sizing.contracts)} contrato(s) · ${number(sizing.hedgedQuantity)} ${sizing.unitLabel ?? "unidades"}`}{sizing.coverageRatio !== null && <p className="mt-1 text-[10px]">Cobertura: {new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 2 }).format(sizing.coverageRatio)}</p>}</td><td className="px-3 py-3 text-[#55736d]">{sizing.observedPrice === null ? "Preço/prêmio indisponível" : `${moneyValue(sizing.observedPrice)} · ${sizing.priceLabel ?? "observado"}`}{sizing.marginEstimate !== null ? <p className="mt-1">Margem: {moneyValue(sizing.marginEstimate)}</p> : <p className="mt-1 text-[10px]">Margem MT: indisponível</p>}</td><td className="px-3 py-3 text-[#55736d]">{link ? `${link.price_source.source_asof} · hash preservado` : catalogBlocked ? issueMessage?.message ?? "Índice B3 indisponível" : alternative.source_ids.includes("B3_PUBLIC_FILES") ? "Boletim oficial disponível; série não vinculada" : "Termos bilaterais necessários"}</td><td className="px-3 py-3"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] ${current.tone === "ok" ? "bg-[#e5f7f1] text-[#20715f]" : "bg-[#fff6df] text-[#7d622d]"}`}>{current.tone === "ok" ? <CheckCircle2 className="h-3 w-3" /> : <CircleAlert className="h-3 w-3" />}{current.label}</span>{result?.limitation && <p className="mt-1 max-w-[260px] text-[10px] leading-4 text-[#71858a]">{result.limitation}</p>}</td></tr>;
    })}</tbody></table></div></CardContent>
  </Card>;
}

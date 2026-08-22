import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Calculator, Loader2, ShieldAlert, Target } from "lucide-react";
import React, { useMemo, useState } from "react";
import type { CanonicalHedgeDataframes, SessionInstrumentMasterRow } from "../../../server/domain/dataframes";
import type { CommodityOptionSizingPublication } from "../../../server/domain/canonicalCommodityOptionSizing";

const unitLabels = { ARROBA: "arroba", SACA_60KG: "saca de 60 kg", METRIC_TON: "tonelada métrica", CUBIC_METER: "metro cúbico", TROY_OUNCE: "onça troy" } as const;
const optionContracts = ["BGI", "CCM", "SOY", "SJC"] as const;
type ExposureUnit = "" | keyof typeof unitLabels;

/**
 * O dimensionamento de opção permanece estritamente limitado a contratos com
 * ficha específica preservada. As demais alternativas continuam visíveis no
 * diagnóstico, mas não são transformadas em equivalência física por suposição.
 */
export default function CommodityOptionSizer({ dataframes, instrumentMasterRows, onSizing }: { dataframes: CanonicalHedgeDataframes; instrumentMasterRows: SessionInstrumentMasterRow[]; onSizing?: (publication: CommodityOptionSizingPublication) => void }) {
  const [economicSituationId, setEconomicSituationId] = useState("");
  const [exposureUnit, setExposureUnit] = useState<ExposureUnit>("");
  const [roundingPolicy, setRoundingPolicy] = useState<"FLOOR" | "NEAREST" | "CEILING">("NEAREST");
  const [optionPosition, setOptionPosition] = useState<"" | "LONG" | "SHORT">("");
  const [optionType, setOptionType] = useState<"" | "CALL" | "PUT">("");
  const candidates = useMemo(() => dataframes.economic_situation_dataframe.filter(situation => situation.commodity_reference && dataframes.hedge_alternative_dataframe.some(alternative => alternative.economic_situation_id === situation.economic_situation_id && alternative.alternative_kind === "B3_COMMODITY_OPTION")), [dataframes]);
  const selected = candidates.find(situation => situation.economic_situation_id === economicSituationId);
  const contract = selected?.commodity_reference ?? "BGI";
  const optionContract = optionContracts.find(candidate => candidate === contract);
  const alternative = selected ? dataframes.hedge_alternative_dataframe.find(item => item.economic_situation_id === selected.economic_situation_id && item.alternative_kind === "B3_COMMODITY_OPTION") : undefined;
  const hasSpecification = Boolean(optionContract) && instrumentMasterRows.some(row => row.source === "B3_PRODUCT_SPECIFICATION" && row.instrument_key === `${optionContract}_OPTION` && row.product_kind === "B3_COMMODITY_OPTION" && row.validation_status === "official_specification_loaded");
  const selectedObservation = alternative ? dataframes.b3_observation_link_dataframe?.find(row => row.alternative_id === alternative.alternative_id && row.family === contract && row.instrument_type === "OPTION") : undefined;
  const query = trpc.hedge.sizeCommodityOption.useQuery({ contract: optionContract ?? "BGI", exposureQuantity: selected?.declared_quantity ?? 1, exposureUnit: exposureUnit || "ARROBA", roundingPolicy }, { enabled: Boolean(selected && exposureUnit && optionContract && hasSpecification), retry: false });
  const canShowResult = Boolean(selected && exposureUnit && optionContract && hasSpecification && query.data);
  const canPublish = Boolean(canShowResult && alternative && selectedObservation && optionPosition && optionType && optionContract);

  return <Card className="mt-7 rounded-2xl border-[#d7d5ee] bg-[#faf9ff] shadow-none">
    <CardHeader className="flex flex-row items-start justify-between border-b border-[#e8e6f4] pb-4">
      <div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#716d9c]">Opções de commodity</p><CardTitle className="mt-1 text-base text-[#37325f]">Referência física do futuro-objeto</CardTitle></div><Target className="h-5 w-5 text-[#6154a2]" />
    </CardHeader>
    <CardContent className="p-5">
      <p className="text-xs leading-5 text-[#625e79]">Publica apenas a equivalência física máxima do futuro-objeto. Não é delta, probabilidade de exercício, prêmio, MTM, volatilidade implícita ou Greeks.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div><Label htmlFor="commodity-option-situation" className="text-xs">Exposição de commodity diagnosticada</Label><select id="commodity-option-situation" value={economicSituationId} onChange={event => { setEconomicSituationId(event.target.value); setExposureUnit(""); }} className="mt-1.5 h-9 w-full rounded-md border border-[#dedcef] bg-white px-3 text-sm"><option value="">Selecione uma exposição</option>{candidates.map(item => <option key={item.economic_situation_id} value={item.economic_situation_id}>{item.description} — {item.declared_quantity.toLocaleString("pt-BR")} ({item.commodity_reference})</option>)}</select></div>
        <div><Label htmlFor="commodity-option-unit" className="text-xs">Unidade física declarada</Label><select id="commodity-option-unit" value={exposureUnit} onChange={event => setExposureUnit(event.target.value as ExposureUnit)} className="mt-1.5 h-9 w-full rounded-md border border-[#dedcef] bg-white px-3 text-sm"><option value="">Confirme a unidade</option><option value="ARROBA">Arroba</option><option value="SACA_60KG">Saca de 60 kg</option><option value="METRIC_TON">Tonelada métrica</option><option value="CUBIC_METER">Metro cúbico</option><option value="TROY_OUNCE">Onça troy</option></select></div>
        <div><Label htmlFor="commodity-option-rounding" className="text-xs">Política de arredondamento</Label><select id="commodity-option-rounding" value={roundingPolicy} onChange={event => setRoundingPolicy(event.target.value as typeof roundingPolicy)} className="mt-1.5 h-9 w-full rounded-md border border-[#dedcef] bg-white px-3 text-sm"><option value="FLOOR">Para baixo</option><option value="NEAREST">Mais próximo</option><option value="CEILING">Para cima</option></select></div>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div><Label htmlFor="commodity-option-position" className="text-xs">Posição declarada</Label><select id="commodity-option-position" value={optionPosition} onChange={event => setOptionPosition(event.target.value as typeof optionPosition)} className="mt-1.5 h-9 w-full rounded-md border border-[#dedcef] bg-white px-3 text-sm"><option value="">Selecione</option><option value="LONG">Titular (long)</option><option value="SHORT">Lançador (short)</option></select></div>
        <div><Label htmlFor="commodity-option-type" className="text-xs">Tipo da opção</Label><select id="commodity-option-type" value={optionType} onChange={event => setOptionType(event.target.value as typeof optionType)} className="mt-1.5 h-9 w-full rounded-md border border-[#dedcef] bg-white px-3 text-sm"><option value="">Selecione</option><option value="CALL">Call</option><option value="PUT">Put</option></select></div>
      </div>
      {selected && <div className="mt-4 rounded-xl border border-[#e4e1f2] bg-white p-3 text-xs text-[#55506b]"><p><strong>Ativo-objeto:</strong> futuro {contract}. {!optionContract ? "A alternativa de opção permanece visível, mas o dimensionamento exige ficha específica da opção preservada." : hasSpecification ? "Ficha específica da opção carregada." : "Adicione a ficha específica da opção no Instrument Master."} {selectedObservation ? `Série B3 de opção vinculada: ${selectedObservation.symbol}.` : "Selecione também uma observação B3 de opção compatível."}</p></div>}
      {selected && exposureUnit && hasSpecification && query.isFetching && <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#e4e1f2] bg-white p-3 text-xs text-[#55506b]"><Loader2 className="h-4 w-4 animate-spin" />Validando a equivalência física do futuro-objeto pela ficha B3…</div>}
      {query.isError && <p className="mt-4 rounded-xl border border-[#f0d5bc] bg-[#fff8ef] p-3 text-xs text-[#9d5a22]">{query.error.message}</p>}
      {canShowResult && <><div className="mt-4 grid gap-3 md:grid-cols-4"><div className="rounded-xl bg-[#40396d] px-4 py-3 text-white"><p className="text-[10px] uppercase tracking-[.15em] text-[#d7d1ff]">Contratos</p><p className="mt-2 text-2xl font-semibold">{query.data!.contracts}</p></div><div className="rounded-xl border border-[#ddd9f0] bg-white px-4 py-3"><p className="text-[10px] uppercase tracking-[.15em] text-[#756f91]">Referência máxima</p><p className="mt-2 font-mono text-sm font-semibold text-[#423c60]">{query.data!.referencedUnderlyingQuantity.toLocaleString("pt-BR")} {unitLabels[query.data!.unit]}</p></div><div className="rounded-xl border border-[#ddd9f0] bg-white px-4 py-3"><p className="text-[10px] uppercase tracking-[.15em] text-[#756f91]">Residual físico</p><p className="mt-2 font-mono text-sm font-semibold text-[#423c60]">{query.data!.residualQuantity.toLocaleString("pt-BR")}</p></div><div className="rounded-xl border border-[#ddd9f0] bg-white px-4 py-3"><p className="text-[10px] uppercase tracking-[.15em] text-[#756f91]">Referência / exposição</p><p className="mt-2 font-mono text-sm font-semibold text-[#423c60]">{new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 2 }).format(query.data!.coverageRatio)}</p></div></div><div className="mt-4 flex flex-wrap items-start justify-between gap-3 text-xs leading-5 text-[#625e79]"><div className="flex gap-2"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#91723a]" /><p>{query.data!.limitation}</p></div>{onSizing && <Button type="button" variant="outline" size="sm" disabled={!canPublish} onClick={() => selected && alternative && optionPosition && optionType && optionContract && onSizing({ alternativeId: alternative.alternative_id, economicSituationId: selected.economic_situation_id, contract: optionContract, exposureQuantity: selected.declared_quantity, exposureUnit: query.data!.unit, roundingPolicy, optionPosition, optionType, contracts: query.data!.contracts, coverageRatio: query.data!.coverageRatio })}><Calculator /> Registrar referência física</Button>}</div></>}
    </CardContent>
  </Card>;
}

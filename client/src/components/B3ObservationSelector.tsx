import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Database, Loader2, MousePointerClick } from "lucide-react";
import React, { useMemo, useState } from "react";
import type { B3NormalizedArtifact } from "./B3ManualCollectionCard";
import type { CanonicalHedgeDataframes } from "../../../server/domain/dataframes";
import { getB3ObservationCompatibility, type B3ObservationSelectionPublication } from "../../../server/domain/canonicalB3ObservationLink";

const FAMILIES = ["DOL", "WDO", "DI1", "BGI", "CCM", "SOY", "SJC"] as const;
type B3PriceNormalizedArtifact = B3NormalizedArtifact & { report_type: "BVBG.086.01" | "BVBG.187.01" };

function displayPrice(value: number | null) {
  return value === null ? "—" : new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 8 }).format(value);
}

/** Seleção intencional de uma observação B3; não escolhe ticker, vencimento ou produto automaticamente. */
export default function B3ObservationSelector({ artifacts, dataframes, onSelected }: { artifacts: B3NormalizedArtifact[]; dataframes: CanonicalHedgeDataframes; onSelected?: (publication: B3ObservationSelectionPublication) => void }) {
  const priceArtifacts = useMemo(() => artifacts.filter((item): item is B3PriceNormalizedArtifact => item.report_type === "BVBG.086.01" || item.report_type === "BVBG.187.01"), [artifacts]);
  const instrumentArtifacts = useMemo(() => artifacts.filter(item => item.report_type === "BVBG.028.02"), [artifacts]);
  const b3Alternatives = useMemo(() => dataframes.hedge_alternative_dataframe.filter(item => item.source_ids.includes("B3_PUBLIC_FILES")), [dataframes.hedge_alternative_dataframe]);
  const [alternativeId, setAlternativeId] = useState("");
  const [family, setFamily] = useState<(typeof FAMILIES)[number]>("DOL");
  const [priceManifestKey, setPriceManifestKey] = useState("");
  const [instrumentManifestKey, setInstrumentManifestKey] = useState("");
  const selectedAlternative = b3Alternatives.find(item => item.alternative_id === alternativeId);
  const selectedSituation = selectedAlternative ? dataframes.economic_situation_dataframe.find(item => item.economic_situation_id === selectedAlternative.economic_situation_id) : undefined;
  const compatibility = selectedAlternative ? getB3ObservationCompatibility(selectedAlternative, selectedSituation) : null;
  const visibleFamilies = compatibility?.families ?? [];
  const selectedPrice = priceArtifacts.find(item => item.manifest.storage_key === priceManifestKey);
  const selectedInstrument = instrumentArtifacts.find(item => item.manifest.storage_key === instrumentManifestKey);
  const input = useMemo(() => selectedPrice && selectedInstrument && compatibility ? { priceManifestStorageKey: selectedPrice.manifest.storage_key, instrumentManifestStorageKey: selectedInstrument.manifest.storage_key, priceReportType: selectedPrice.report_type, family, limit: 100 } : undefined, [compatibility, family, selectedInstrument, selectedPrice]);
  const observations = trpc.marketData.readB3NormalizedObservations.useQuery(input!, { enabled: Boolean(input), retry: false });
  const observationData = observations.data ?? null;
  const visibleCandidates = observationData?.candidates.filter(candidate => compatibility?.families.includes(candidate.family) && compatibility.instrumentTypes.includes(candidate.instrumentType)) ?? [];

  function publish(candidateIndex: number) {
    const candidate = visibleCandidates[candidateIndex];
    if (!candidate || !alternativeId || !onSelected || !observationData || !compatibility) return;
    onSelected({
      alternativeId,
      candidate,
      priceSource: {
        reportType: observationData.priceSource.reportType,
        sourceUrl: observationData.priceSource.sourceUrl,
        sourceFile: observationData.priceSource.sourceFile,
        sourceAsOf: observationData.priceSource.sourceAsOf!,
        sourceHashSha256: observationData.priceSource.sourceHashSha256!,
        normalizedCsvStorageKey: observationData.priceSource.normalizedCsvStorageKey,
        normalizedCsvSha256: observationData.priceSource.normalizedCsvSha256,
        normalizedManifestStorageKey: observationData.priceSource.normalizedManifestStorageKey,
      },
      instrumentSource: {
        sourceUrl: observationData.instrumentSource.sourceUrl,
        sourceFile: observationData.instrumentSource.sourceFile,
        sourceAsOf: observationData.instrumentSource.sourceAsOf!,
        sourceHashSha256: observationData.instrumentSource.sourceHashSha256!,
        normalizedCsvStorageKey: observationData.instrumentSource.normalizedCsvStorageKey,
        normalizedCsvSha256: observationData.instrumentSource.normalizedCsvSha256,
        normalizedManifestStorageKey: observationData.instrumentSource.normalizedManifestStorageKey,
      },
      selectedAtUtc: new Date().toISOString(),
    });
  }

  return <Card className="mt-7 rounded-2xl border-[#b9ddd4] bg-white shadow-[0_20px_45px_-38px_rgba(16,58,58,.35)]">
    <CardHeader className="border-b border-[#e8f1ef] bg-[#f6fbf9] pb-4"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#5f8981]">Seleção auditável de série</p><CardTitle className="mt-1 text-base text-[#173c3b]">Vincular observação B3 a uma alternativa</CardTitle></div><MousePointerClick className="h-5 w-5 text-[#21826d]" /></div><p className="mt-3 text-xs leading-5 text-[#5d7875]">Escolha explicitamente os dois artefatos normalizados, a família, a alternativa e a série. O sistema somente associa PriceReport e InstrumentReport com a mesma data-base e hashes verificáveis; não seleciona vencimento nem preço por inferência.</p></CardHeader>
    <CardContent className="p-5">
      {artifacts.length === 0 ? <div className="rounded-xl border border-dashed border-[#d7e7e2] bg-[#fbfdfc] px-4 py-5 text-sm text-[#71878e]">Normalize pelo menos um PriceReport e um InstrumentReport no cartão de coleta B3 para habilitar a seleção.</div> : <>
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          <div><Label htmlFor="observation-alt" className="text-xs text-[#496762]">Alternativa B3</Label><select id="observation-alt" value={alternativeId} onChange={event => { const next = event.target.value; setAlternativeId(next); const nextAlternative = b3Alternatives.find(item => item.alternative_id === next); const nextSituation = nextAlternative ? dataframes.economic_situation_dataframe.find(item => item.economic_situation_id === nextAlternative.economic_situation_id) : undefined; const nextCompatibility = nextAlternative ? getB3ObservationCompatibility(nextAlternative, nextSituation) : null; if (nextCompatibility?.families[0]) setFamily(nextCompatibility.families[0] as (typeof FAMILIES)[number]); }} className="mt-1.5 h-10 w-full rounded-md border border-[#d8e5e2] bg-white px-3 text-sm text-[#29474f]"><option value="">Selecione</option>{b3Alternatives.map(item => <option key={item.alternative_id} value={item.alternative_id}>{item.label}</option>)}</select></div>
          <div><Label htmlFor="observation-family" className="text-xs text-[#496762]">Família B3 compatível</Label><select id="observation-family" value={family} disabled={!compatibility} onChange={event => setFamily(event.target.value as (typeof FAMILIES)[number])} className="mt-1.5 h-10 w-full rounded-md border border-[#d8e5e2] bg-white px-3 font-mono text-sm text-[#29474f] disabled:cursor-not-allowed disabled:opacity-60"><option value="">Selecione alternativa</option>{visibleFamilies.map(item => <option key={item} value={item}>{item}</option>)}</select></div>
          <div><Label htmlFor="price-manifest" className="text-xs text-[#496762]">PriceReport normalizado</Label><select id="price-manifest" value={priceManifestKey} onChange={event => setPriceManifestKey(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-[#d8e5e2] bg-white px-3 font-mono text-xs text-[#29474f]"><option value="">Selecione</option>{priceArtifacts.map(item => <option key={item.manifest.storage_key} value={item.manifest.storage_key}>{item.report_type} · {item.source_asof}</option>)}</select></div>
          <div><Label htmlFor="instrument-manifest" className="text-xs text-[#496762]">InstrumentReport normalizado</Label><select id="instrument-manifest" value={instrumentManifestKey} onChange={event => setInstrumentManifestKey(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-[#d8e5e2] bg-white px-3 font-mono text-xs text-[#29474f]"><option value="">Selecione</option>{instrumentArtifacts.map(item => <option key={item.manifest.storage_key} value={item.manifest.storage_key}>{item.report_type} · {item.source_asof}</option>)}</select></div>
        </div>
        {selectedAlternative && compatibility && <p className="mt-4 rounded-lg border border-[#dceae6] bg-[#fbfdfc] px-3 py-2 text-[11px] leading-5 text-[#55736d]">Compatibilidade validada: famílias <strong className="font-mono">{compatibility.families.join(" · ")}</strong> e tipo <strong className="font-mono">{compatibility.instrumentTypes.join(" · ")}</strong>. Outras combinações são bloqueadas.</p>}
        {observations.isFetching && <div className="mt-5 flex items-center gap-2 rounded-xl border border-[#cce4df] bg-[#f2fbf7] px-4 py-3 text-xs text-[#327569]"><Loader2 className="h-4 w-4 animate-spin" />Lendo manifestos, conferindo hashes e associando cadastro e preço na mesma data-base…</div>}
        {observations.isError && <div className="mt-5 rounded-xl border border-[#f0d5bc] bg-[#fff8ef] px-4 py-3 text-xs leading-5 text-[#945b29]">{observations.error.message}</div>}
        {observationData && <div className="mt-5 overflow-x-auto rounded-xl border border-[#dceae6]"><div className="border-b border-[#e8f1ef] bg-[#f8fbfa] px-4 py-3 text-xs text-[#55736d]"><Database className="mr-1.5 inline h-3.5 w-3.5 text-[#21826d]" />{visibleCandidates.length} observação(ões) compatível(is) de <strong>{family}</strong>. Selecione uma linha para registrar o vínculo, sem dimensionar ou precificar.</div>{visibleCandidates.length === 0 ? <p className="px-4 py-5 text-xs text-[#71878e]">Nenhuma observação de família e tipo compatíveis foi encontrada nos artefatos escolhidos.</p> : <table className="min-w-[940px] w-full text-left text-xs"><thead className="bg-[#fbfdfc] text-[10px] uppercase tracking-[.1em] text-[#69847f]"><tr><th className="px-4 py-3">Série</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Vencimento</th><th className="px-4 py-3 text-right">Último</th><th className="px-4 py-3 text-right">Ajuste</th><th className="px-4 py-3">Evidência</th><th className="px-4 py-3" /></tr></thead><tbody className="divide-y divide-[#edf2f0]">{visibleCandidates.map((candidate, index) => <tr key={`${candidate.instrumentId}-${candidate.symbol}`}><td className="px-4 py-3 font-mono font-semibold text-[#244e48]">{candidate.symbol}</td><td className="px-4 py-3"><Badge variant="outline" className="border-[#d7e7e2] bg-[#fbfdfc] text-[10px] text-[#466761]">{candidate.instrumentType}</Badge></td><td className="px-4 py-3 font-mono text-[#567078]">{candidate.maturity ?? "não informado"}</td><td className="px-4 py-3 text-right font-mono text-[#456761]">{displayPrice(candidate.lastPrice)}</td><td className="px-4 py-3 text-right font-mono text-[#456761]">{displayPrice(candidate.adjustedQuote ?? candidate.adjustedQuoteTax)}</td><td className="max-w-[220px] px-4 py-3 font-mono text-[10px] leading-4 text-[#617b76]">{candidate.sourceFile}<br />{candidate.sourceHashSha256 ?? "sem hash"}</td><td className="px-4 py-3 text-right"><Button size="sm" variant="outline" disabled={!alternativeId} onClick={() => publish(index)} className="border-[#b9ddd4] bg-white text-[#1b715e] hover:bg-[#edf9f5]"><CheckCircle2 /> Vincular</Button></td></tr>)}</tbody></table>}</div>}
      </>}
    </CardContent>
  </Card>;
}

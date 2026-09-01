import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, CheckCircle2, FileCheck2, Loader2, TableProperties } from "lucide-react";
import React from "react";

type Association = {
  status: string;
  priceAsOf: string;
  instrumentReportAsOf: string;
  message: string;
};

function AssociationNotice({ association }: { association: Association }) {
  const blocked = association.status === "blocked_asof_mismatch";
  return (
    <div className={`flex gap-3 rounded-xl border p-3.5 ${blocked ? "border-[#f0d5bc] bg-[#fff8ef]" : "border-[#bde5dc] bg-[#effbf7]"}`}>
      {blocked ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#b16a26]" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#21826d]" />}
      <div>
        <p className={`text-xs font-semibold ${blocked ? "text-[#804818]" : "text-[#176957]"}`}>{blocked ? "Associação quantitativa bloqueada por data-base divergente" : "Associação por identificador validada para a mesma data-base"}</p>
        <p className={`mt-1 text-[11px] leading-5 ${blocked ? "text-[#926b43]" : "text-[#427368]"}`}>Preços: {association.priceAsOf}. Cadastro: {association.instrumentReportAsOf}. {association.message}</p>
      </div>
    </div>
  );
}

export default function B3RealPipelineCard() {
  const snapshot = trpc.marketData.b3RealSnapshot.useQuery();
  if (snapshot.isLoading) {
    return <Card className="mt-7 rounded-2xl border-[#dbe8e5] bg-white"><CardContent className="flex items-center gap-2 p-5 text-sm text-[#647d83]"><Loader2 className="h-4 w-4 animate-spin" />Carregando manifesto do pipeline B3…</CardContent></Card>;
  }
  if (!snapshot.data) return null;

  const priorityFamilies = new Set(["DOL", "WDO", "DI1", "BGI", "CCM", "SOY", "SJC"]);
  const coverage = snapshot.data.coverage086.filter(item => priorityFamilies.has(String(item.family)));
  const blocked = (snapshot.data.association.status as string) === "blocked_asof_mismatch";

  return (
    <Card className="mt-7 overflow-hidden rounded-2xl border-[#cde4df] bg-white shadow-[0_20px_45px_-38px_rgba(16,58,58,.35)]">
      <CardHeader className="border-b border-[#e8f1ef] bg-[#f6fbf9] pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#5f8981]">Pipeline validado com arquivos reais</p>
            <CardTitle className="mt-1 text-base text-[#173c3b]">B3: PriceReport, DerivativesSimplifiedPriceReport e InstrumentReport</CardTitle>
          </div>
          <FileCheck2 className="h-5 w-5 text-[#21826d]" />
        </div>
        <p className="mt-3 text-xs leading-5 text-[#5d7875]">Data-base dos preços: <strong>{snapshot.data.asOf}</strong>. O painel exibe metadados, colunas e cobertura de DataFrames reais; não embute preços individuais.</p>
      </CardHeader>
      <CardContent className="p-5">
        <AssociationNotice association={snapshot.data.association} />
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {snapshot.data.files.map(file => (
            <div key={file.reportType} className="rounded-xl border border-[#dceae6] bg-white px-4 py-3">
              <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#269179]" /><p className="font-mono text-xs font-semibold text-[#28574f]">{file.reportType}</p></div>
              <p className="mt-2 truncate font-mono text-[10px] text-[#708984]" title={file.filename}>{file.filename}</p>
              <p className="mt-1 text-[11px] text-[#607975]">{new Intl.NumberFormat("pt-BR").format(file.records)} registros • SHA-256 preservado</p>
              <a href={file.downloadUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[11px] font-semibold text-[#16745f] underline">Fluxo oficial de download</a>
            </div>
          ))}
        </div>
        <div className="mt-5 overflow-hidden rounded-xl border border-[#dceae6]">
          <div className="grid grid-cols-6 gap-2 bg-[#f2f8f6] px-4 py-2 text-[9px] font-semibold uppercase tracking-[.1em] text-[#698680]"><span>Família</span><span>Registros</span><span>Futuros</span><span>Opções</span><span>Com negócio</span><span>Com ajuste</span></div>
          {coverage.map(item => <div key={item.family} className="grid grid-cols-6 gap-2 border-t border-[#edf3f1] px-4 py-2.5 font-mono text-xs text-[#385a55]"><span className="font-semibold">{item.family}</span><span>{item.records}</span><span>{item.futureRecords}</span><span>{item.optionRecords}</span><span>{item.recordsWithTradePrice}</span><span>{item.recordsWithAdjustedQuote}</span></div>)}
        </div>
        {blocked && <p className="mt-2 text-[10px] leading-4 text-[#8b8176]">A cobertura é apresentada apenas para inspeção e não está disponível para cálculo enquanto o bloqueio persistir.</p>}
        <details className="mt-5 rounded-xl border border-[#dceae6] bg-[#fbfdfc] px-4 py-3">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold text-[#315a53]"><TableProperties className="h-4 w-4" />{snapshot.data.columns.length} colunas materializadas no DataFrame de preços</summary>
          <div className="mt-3 flex flex-wrap gap-1.5">{snapshot.data.columns.map(column => <code key={column} className="rounded bg-[#eaf3f0] px-1.5 py-1 text-[10px] text-[#42665f]">{column}</code>)}</div>
        </details>
        <p className="mt-4 text-[11px] leading-5 text-[#718983]">{snapshot.data.limitation}</p>
      </CardContent>
    </Card>
  );
}

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Archive, CheckCircle2, ExternalLink, FileKey2, Loader2, ShieldCheck } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const B3_REPORTS = ["BVBG.086.01", "BVBG.187.01", "BVBG.028.02"] as const;

function formatBytes(bytes: number) {
  if (bytes < 1_000_000) return `${(bytes / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kB`;
  return `${(bytes / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}

export type B3ManualLineageRow = { source_id: "B3_PUBLIC_FILES"; source_url: string; source_file: string; extracted_at_utc: string; source_asof: string | null; source_hash_sha256: string | null; parser_version: string; validation_status: "valid" | "warning" | "invalid" };
export type B3NormalizedArtifact = {
  report_type: (typeof B3_REPORTS)[number];
  source_asof: string;
  source_file: string;
  validation_status: "valid" | "warning" | "invalid";
  csv: { storage_key: string; storage_url: string; sha256: string };
  manifest: { storage_key: string; storage_url: string };
};

function lastBusinessDate() {
  const value = new Date();
  value.setDate(value.getDate() - 1);
  while (value.getDay() === 0 || value.getDay() === 6) value.setDate(value.getDate() - 1);
  return value.toISOString().slice(0, 10);
}

export default function B3ManualCollectionCard({ onLineage, onNormalizations, autoCollect = false }: { onLineage?: (rows: B3ManualLineageRow[]) => void; onNormalizations?: (rows: B3NormalizedArtifact[]) => void; autoCollect?: boolean }) {
  const [asOf, setAsOf] = useState(lastBusinessDate);
  const [reportTypes, setReportTypes] = useState<(typeof B3_REPORTS)[number][]>([...B3_REPORTS]);
  const [normalize, setNormalize] = useState(false);
  const autoStarted = useRef(false);
  const collection = trpc.marketData.collectB3Reports.useMutation({
    onError: error => toast.error(error.message),
    onSuccess: result => toast.success(`${result.reports.length} boletim(ns) B3 coletado(s) com arquivo bruto e hashes preservados.`),
  });
  useEffect(() => {
    if (!autoCollect || autoStarted.current) return;
    autoStarted.current = true;
    collection.mutate({ asOf, reportTypes: [...B3_REPORTS], normalize: false, persistRaw: false });
  }, [asOf, autoCollect, collection]);
  useEffect(() => {
    if (!collection.data || !onLineage) return;
    const extractedAtUtc = new Date().toISOString();
    onLineage(collection.data.reports.flatMap(report => report.xmlFiles.map(xml => ({ source_id: "B3_PUBLIC_FILES" as const, source_url: report.officialDownloadUrl, source_file: xml.filename, extracted_at_utc: extractedAtUtc, source_asof: report.sourceAsOf, source_hash_sha256: xml.sha256, parser_version: "b3-official-download-v1", validation_status: report.validationStatus === "downloaded" ? "valid" as const : "warning" as const }))));
  }, [collection.data, onLineage]);
  useEffect(() => {
    if (!collection.data || !onNormalizations) return;
    onNormalizations(collection.data.reports.flatMap(report => report.normalizations.map(normalization => ({
      report_type: report.reportType,
      source_asof: report.sourceAsOf,
      source_file: normalization.sourceFile,
      validation_status: normalization.validationStatus,
      csv: { storage_key: normalization.csv.storageKey, storage_url: normalization.csv.storageUrl, sha256: normalization.csv.sha256 },
      manifest: { storage_key: normalization.manifest.storageKey, storage_url: normalization.manifest.storageUrl },
    }))));
  }, [collection.data, onNormalizations]);

  function toggleReport(reportType: (typeof B3_REPORTS)[number]) {
    setReportTypes(current => current.includes(reportType) ? current.filter(item => item !== reportType) : [...current, reportType]);
  }

  function collectReports() {
    if (reportTypes.length === 0) {
      toast.error("Selecione ao menos um boletim B3.");
      return;
    }
    collection.mutate({ asOf, reportTypes, normalize, persistRaw: false });
  }

  return (
    <Card className="mt-7 rounded-2xl border-[#cce4df] bg-white shadow-[0_20px_45px_-38px_rgba(16,58,58,.35)]">
      <CardHeader className="border-b border-[#e8f1ef] bg-[#f6fbf9] pb-4">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#5f8981]">Coleta sob demanda</p><CardTitle className="mt-1 text-base text-[#173c3b]">Recuperar boletins oficiais B3</CardTitle></div>
          <Archive className="h-5 w-5 text-[#21826d]" />
        </div>
        <p className="mt-3 text-xs leading-5 text-[#5d7875]">A coleta usa exclusivamente o fluxo oficial de Pesquisa por Pregão. PriceReport, relatório simplificado e InstrumentReport podem ser preservados no armazenamento de objetos, sem gravação em banco de dados.</p>
      </CardHeader>
      <CardContent className="p-5">
        {autoCollect ? <div className="rounded-xl border border-[#cce4df] bg-[#f2fbf7] p-4"><p className="text-sm font-semibold text-[#1d6257]">Atualização automática dos três boletins oficiais B3</p><p className="mt-1 text-xs leading-5 text-[#466962]">A abertura consulta PriceReport, relatório simplificado e InstrumentReport na última data útil. Valida ZIPs, data-base e hashes sem reter arquivos grandes na memória do serviço. Nenhuma curva, preço ou DataFrame é publicado se a B3 não devolver arquivos válidos.</p><p className="mt-3 text-xs font-medium text-[#2f7669]">{collection.isPending ? "Baixando, verificando ZIPs e calculando hashes…" : collection.data ? `${collection.data.reports.length} boletim(ns) B3 verificado(s) nesta sessão.` : collection.isError ? "A B3 não respondeu com arquivo oficial válido; a sessão permanece sem dados B3." : "Aguardando início da atualização oficial…"}</p></div> : <><div className="grid gap-4 md:grid-cols-[190px_1fr_auto] md:items-end">
          <div><Label htmlFor="b3-collection-asof" className="text-xs text-[#496762]">Data-base</Label><Input id="b3-collection-asof" type="date" value={asOf} onChange={event => setAsOf(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div>
          <fieldset><legend className="text-xs font-medium text-[#496762]">Boletins</legend><div className="mt-1.5 flex flex-wrap gap-2">{B3_REPORTS.map(reportType => <button key={reportType} type="button" onClick={() => toggleReport(reportType)} aria-pressed={reportTypes.includes(reportType)} className={`rounded-lg border px-3 py-2 font-mono text-xs font-semibold transition ${reportTypes.includes(reportType) ? "border-[#2b9b83] bg-[#eaf9f4] text-[#176957]" : "border-[#d8e5e2] bg-white text-[#607a76] hover:bg-[#f5faf8]"}`}>{reportType}</button>)}</div></fieldset>
          <Button onClick={collectReports} disabled={collection.isPending || !asOf} className="bg-[#173c45] text-white hover:bg-[#24515a]">{collection.isPending ? <Loader2 className="animate-spin" /> : <Archive />} Coletar agora</Button>
        </div>
        <label className="mt-4 flex cursor-pointer items-start gap-2 rounded-xl border border-[#dceae6] bg-[#fbfdfc] px-3.5 py-3 text-xs text-[#466962]"><input type="checkbox" checked={normalize} onChange={event => setNormalize(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#21826d]" /><span><strong>Normalizar XMLs em DataFrames CSV auditáveis.</strong> Esta etapa calcula validação e campos observados, preserva CSV e manifesto em armazenamento de objetos e retorna apenas metadados; não envia linhas de mercado pesadas ao navegador.</span></label></>}
        {collection.isPending && <div className="mt-5 flex items-center gap-2 rounded-xl border border-[#cce4df] bg-[#f2fbf7] px-4 py-3 text-xs text-[#327569]"><Loader2 className="h-4 w-4 animate-spin" />Baixando, verificando ZIPs e calculando hashes dos XMLs selecionados…</div>}
        {collection.isError && <div role="alert" className="mt-5 rounded-xl border border-[#f1c6bd] bg-[#fff4f0] px-4 py-3 text-xs leading-5 text-[#a54c35]">A coleta B3 não foi concluída para a data-base solicitada. Nenhum arquivo ou DataFrame foi publicado. {collection.error.message}</div>}
        {collection.data && <div className="mt-5 space-y-3">{collection.data.reports.map(report => <div key={report.reportType} className="rounded-xl border border-[#dceae6] bg-[#fbfdfc] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#21826d]" /><p className="font-mono text-xs font-semibold text-[#24594f]">{report.reportType}</p><span className="rounded bg-[#e8f6f1] px-2 py-0.5 text-[10px] font-semibold text-[#267b68]">{report.validationStatus}</span></div><a href={report.officialDownloadUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#17745f] underline">Origem oficial <ExternalLink className="h-3 w-3" /></a></div><div className="mt-3 grid gap-3 text-[11px] text-[#56716c] sm:grid-cols-3"><div><p className="font-semibold text-[#315b53]">Arquivo bruto</p><p className="mt-1 font-mono">{report.outerArchive.filename} • {formatBytes(report.outerArchive.bytes)}</p><p className="mt-1 break-all font-mono text-[10px]">SHA-256 {report.outerArchive.sha256}</p></div><div><p className="font-semibold text-[#315b53]">ZIP interno</p><p className="mt-1 font-mono">{report.innerArchive.filename} • {formatBytes(report.innerArchive.bytes)}</p><p className="mt-1">Data-base {report.sourceAsOf}</p></div><div><p className="font-semibold text-[#315b53]">XMLs identificados</p><p className="mt-1">{report.xmlFiles.length} arquivo(s) no ZIP oficial.</p><p className="mt-1">Hash de XML só é calculado na normalização streaming.</p></div></div>{report.normalizations.length > 0 && <div className="mt-3 rounded-lg border border-[#c9e8df] bg-[#f0fbf7] p-3"><p className="flex items-center gap-1.5 text-[11px] font-semibold text-[#20715f]"><FileKey2 className="h-3.5 w-3.5" />DataFrames normalizados e persistidos</p>{report.normalizations.map(normalization => <div key={normalization.sourceFile} className="mt-2 border-t border-[#d9eee7] pt-2 text-[10px] text-[#4b7068]"><p className="break-all font-mono">{normalization.sourceFile}</p><p>{new Intl.NumberFormat("pt-BR").format(normalization.records)} linhas • {normalization.columns.length} colunas • {normalization.validationStatus} • {normalization.issueCount} alerta(s)</p><a href={normalization.csv.storageUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block font-semibold text-[#17745f] underline">CSV auditável</a><span className="mx-2">•</span><a href={normalization.manifest.storageUrl} target="_blank" rel="noreferrer" className="font-semibold text-[#17745f] underline">Manifesto</a></div>)}</div>}<details className="mt-3 rounded-lg border border-[#e5efec] bg-white px-3 py-2"><summary className="cursor-pointer text-[11px] font-semibold text-[#42665f]">Ver arquivos XML e hashes</summary><div className="mt-2 space-y-2">{report.xmlFiles.map(xml => <div key={xml.filename} className="border-t border-[#edf3f1] pt-2 font-mono text-[10px] text-[#607975]"><p className="break-all">{xml.filename}</p><p>{formatBytes(xml.bytes)} • {xml.sha256 ? `SHA-256 ${xml.sha256}` : "hash disponível na normalização streaming"}</p></div>)}</div></details></div>)}</div>}
        <div className="mt-5 flex gap-2 rounded-xl border border-[#dceae6] bg-[#fbfdfc] p-3 text-[11px] leading-5 text-[#5f7873]"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#21826d]" /><p>Esta ação não cria preços, taxas ou campos inexistentes. A normalização quantitativa continua condicionada ao parser apropriado, à data-base compatível e às convenções confirmadas para cada instrumento.</p></div>
      </CardContent>
    </Card>
  );
}

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, BarChart3, BriefcaseBusiness, CircleCheck, Database, ShieldAlert } from "lucide-react";
import React from "react";

type SourceStatus = { label: string; loaded: boolean; detail: string };

export default function ConsultantCommandCenter({ exposureCount, alternativeCount, sourceStatuses, onCreateExposure, onReviewAlternatives, onOpenTechnicalBase }: { exposureCount: number; alternativeCount: number; sourceStatuses: SourceStatus[]; onCreateExposure: () => void; onReviewAlternatives: () => void; onOpenTechnicalBase: () => void }) {
  const loadedSources = sourceStatuses.filter(source => source.loaded).length;
  const nextStep = exposureCount === 0
    ? { title: "Comece pelo risco da empresa", detail: "Declare um pagamento, recebimento, dívida CDI ou compromisso físico. O app responderá com as alternativas compatíveis.", action: "Declarar exposição", onClick: onCreateExposure }
    : alternativeCount === 0
      ? { title: "Conclua o diagnóstico da exposição", detail: "A exposição está registrada, mas ainda não há alternativas materializadas para análise.", action: "Ver exposição", onClick: onCreateExposure }
      : { title: "Escolha uma alternativa para estudar", detail: "As alternativas já foram declaradas. Selecione uma para ver requisitos, evidência B3 e próximos passos permitidos.", action: "Analisar alternativas", onClick: onReviewAlternatives };

  return <div className="space-y-6">
    <section className="overflow-hidden rounded-3xl bg-[#123941] px-6 py-7 text-white shadow-[0_26px_60px_-34px_rgba(11,48,56,.75)] sm:px-8">
      <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#80ddc9]">HEDGE LAB · central do consultor</p>
      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(290px,.65fr)] lg:items-end">
        <div><h2 className="max-w-3xl text-3xl font-semibold tracking-[-.03em] sm:text-4xl">Comece pela exposição. Decida com evidência.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#b7ccd0]">Organize o risco econômico da empresa, declare as alternativas de hedge compatíveis e avance apenas com os dados, contratos e premissas que já foram validados.</p></div>
        <div className="rounded-2xl border border-white/10 bg-white/[.055] p-4"><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#89dbc9]">Próximo passo</p><p className="mt-2 text-base font-semibold text-white">{nextStep.title}</p><p className="mt-2 text-xs leading-5 text-[#b7ccd0]">{nextStep.detail}</p><Button onClick={nextStep.onClick} className="mt-4 w-full bg-[#75dec3] text-[#103840] hover:bg-[#98ead5]">{nextStep.action}<ArrowRight /></Button></div>
      </div>
    </section>

    <div className="grid gap-4 md:grid-cols-3">
      <Card className="border-[#cce3dd] bg-white shadow-none"><CardContent className="p-5"><div className="flex items-center gap-2 text-[#19685b]"><BriefcaseBusiness className="h-4 w-4" /><p className="text-[10px] font-semibold uppercase tracking-[.14em]">Exposições</p></div><p className="mt-3 text-2xl font-semibold text-[#17363e]">{exposureCount}</p><p className="mt-1 text-xs leading-5 text-[#5c7774]">{exposureCount === 1 ? "risco econômico declarado" : "riscos econômicos declarados"} nesta sessão.</p></CardContent></Card>
      <Card className="border-[#cce3dd] bg-white shadow-none"><CardContent className="p-5"><div className="flex items-center gap-2 text-[#19685b]"><CircleCheck className="h-4 w-4" /><p className="text-[10px] font-semibold uppercase tracking-[.14em]">Alternativas</p></div><p className="mt-3 text-2xl font-semibold text-[#17363e]">{alternativeCount}</p><p className="mt-1 text-xs leading-5 text-[#5c7774]">caminhos de hedge declarados; nenhum foi recomendado automaticamente.</p></CardContent></Card>
      <Card className="border-[#cce3dd] bg-white shadow-none"><CardContent className="p-5"><div className="flex items-center gap-2 text-[#19685b]"><Database className="h-4 w-4" /><p className="text-[10px] font-semibold uppercase tracking-[.14em]">Evidências oficiais</p></div><p className="mt-3 text-2xl font-semibold text-[#17363e]">{loadedSources}/{sourceStatuses.length}</p><p className="mt-1 text-xs leading-5 text-[#5c7774]">fontes disponíveis nesta sessão; indisponibilidades não geram dados substitutos.</p></CardContent></Card>
    </div>

    <Card className="border-[#dce8e5] bg-[#fbfdfc] shadow-none"><CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between"><div className="flex gap-3"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#b07a37]" /><div><p className="text-sm font-semibold text-[#284a4c]">Dados técnicos aparecem no momento certo</p><p className="mt-1 max-w-3xl text-xs leading-5 text-[#607a76]">Arquivos B3, hashes, DataFrames e rotinas de coleta permanecem disponíveis para validação, mas não são pré-requisitos para declarar uma exposição ou entender as alternativas.</p></div></div><Button variant="outline" onClick={onOpenTechnicalBase} className="shrink-0 border-[#bddbd4] bg-white text-[#1c6157] hover:bg-[#effaf6]"><BarChart3 /> Abrir base técnica</Button></CardContent></Card>
  </div>;
}

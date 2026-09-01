import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { CalendarDays, CheckCircle2, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";

export default function BusinessDayCalculatorCard() {
  const [calendarId, setCalendarId] = useState<"B3_TRADING_2026" | "ANBIMA_BANKING_2026">("B3_TRADING_2026");
  const [date, setDate] = useState("2026-08-13");
  const [endDate, setEndDate] = useState("2026-08-14");
  const [offsetBusinessDays, setOffsetBusinessDays] = useState("1");
  const input = useMemo(() => ({ calendarId, date, endDate, offsetBusinessDays: Number(offsetBusinessDays) || 0 }), [calendarId, date, endDate, offsetBusinessDays]);
  const calendar = trpc.marketData.businessCalendar.useQuery(input, { retry: false });

  return (
    <Card className="rounded-2xl border-[#dce8e5] bg-white shadow-[0_22px_45px_-38px_rgba(16,58,58,.4)]">
      <CardHeader className="border-b border-[#edf2f0] pb-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#6c8990]">Convenção operacional</p><CardTitle className="mt-1 text-base text-[#17363e]">Dias úteis e liquidação D+1</CardTitle></div><CalendarDays className="h-5 w-5 text-[#328a7a]" /></div></CardHeader>
      <CardContent className="p-5">
        <div className="grid gap-3 sm:grid-cols-2"><div className="sm:col-span-2"><Label htmlFor="business-calendar" className="text-xs">Calendário oficial</Label><select id="business-calendar" value={calendarId} onChange={event => setCalendarId(event.target.value as typeof calendarId)} className="mt-1.5 h-9 w-full rounded-md border border-[#d8e5e2] bg-white px-3 text-sm text-[#29474f]"><option value="B3_TRADING_2026">B3 — sessões de negociação (2026)</option><option value="ANBIMA_BANKING_2026">ANBIMA — feriados bancários (2026)</option></select></div><div><Label htmlFor="calendar-date" className="text-xs">Data inicial</Label><Input id="calendar-date" type="date" value={date} onChange={event => setDate(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div><div><Label htmlFor="calendar-end-date" className="text-xs">Data final</Label><Input id="calendar-end-date" type="date" value={endDate} onChange={event => setEndDate(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div><div className="sm:col-span-2"><Label htmlFor="business-offset" className="text-xs">Deslocamento em dias úteis</Label><Input id="business-offset" inputMode="numeric" value={offsetBusinessDays} onChange={event => setOffsetBusinessDays(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div></div>
        {calendar.isLoading && <div className="mt-5 flex items-center gap-2 text-xs text-[#688188]"><Loader2 className="h-4 w-4 animate-spin" />Calculando no calendário oficial…</div>}
        {calendar.isError && <p className="mt-5 rounded-lg bg-[#fff5ec] px-3 py-2 text-xs text-[#985b2b]">A data está fora do ano de 2026 ou é inválida; nenhum feriado foi inferido.</p>}
        {calendar.data && <><div className="mt-5 grid grid-cols-3 gap-2"><div className="rounded-lg bg-[#f4faf8] p-3"><p className="text-[10px] font-semibold uppercase tracking-[.1em] text-[#75928a]">Data útil?</p><p className="mt-1 text-sm font-semibold text-[#24594f]">{calendar.data.isBusinessDay ? "Sim" : "Não"}</p></div><div className="rounded-lg bg-[#f4faf8] p-3"><p className="text-[10px] font-semibold uppercase tracking-[.1em] text-[#75928a]">D+1</p><p className="mt-1 font-mono text-sm font-semibold text-[#24594f]">{calendar.data.settlementD1}</p></div><div className="rounded-lg bg-[#f4faf8] p-3"><p className="text-[10px] font-semibold uppercase tracking-[.1em] text-[#75928a]">(início, fim]</p><p className="mt-1 text-sm font-semibold text-[#24594f]">{calendar.data.businessDaysToEnd} dia(s)</p></div></div><div className="mt-4 flex gap-2 rounded-lg border border-[#dceae6] bg-[#fbfdfc] p-3 text-[11px] leading-5 text-[#5f7873]"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#21826d]" /><p><a href={calendar.data.lineage.sourceUrl} target="_blank" rel="noreferrer" className="font-semibold text-[#17745f] underline">Fonte oficial</a> • {calendar.data.lineage.description} A cobertura é restrita a {calendar.data.lineage.year}.</p></div></>}
      </CardContent>
    </Card>
  );
}

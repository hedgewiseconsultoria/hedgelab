import { BUSINESS_CALENDARS, isBusinessDay } from "./businessCalendar";
import type { BcbSelicDataset } from "../ingestion/bcbSelic";

export type Sgs11OverAccumulation = {
  method: "BCB_SGS_11_DAILY_OVER_COMPOUND";
  startDate: string;
  endDate: string;
  calendarId: "ANBIMA_BANKING_2026";
  observationCount: number;
  accumulatedFactor: number;
  accumulatedPct: number;
  observations: Array<{ asOf: string; dailyOverPct: number }>;
  lineage: { bcb: BcbSelicDataset["lineage"]; calendar: typeof BUSINESS_CALENDARS.ANBIMA_BANKING_2026 };
  limitations: string[];
};

function assertDate(value: string, label: string) {
  if (!/^2026-\d{2}-\d{2}$/.test(value)) throw new Error(`${label} deve pertencer a 2026, único ano coberto pelo calendário bancário oficial da sessão.`);
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error(`${label} é inválida.`);
}

function bankingDates(startDate: string, endDate: string) {
  assertDate(startDate, "Data inicial"); assertDate(endDate, "Data final");
  if (startDate > endDate) throw new Error("A data inicial não pode ser posterior à data final.");
  if (!isBusinessDay(startDate, "ANBIMA_BANKING_2026") || !isBusinessDay(endDate, "ANBIMA_BANKING_2026")) throw new Error("As datas inicial e final devem ser dias úteis bancários validados pelo calendário ANBIMA 2026.");
  const dates: string[] = [];
  const cursor = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  while (cursor <= end) {
    const date = cursor.toISOString().slice(0, 10);
    if (isBusinessDay(date, "ANBIMA_BANKING_2026")) dates.push(date);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

/** Capitaliza exclusivamente as observações diárias publicadas pela SGS 11, sem conversão para taxa anual, curva ou dia interpolado. */
export function calculateSgs11OverAccumulation(input: { startDate: string; endDate: string; dataset: BcbSelicDataset }): Sgs11OverAccumulation {
  const expectedDates = bankingDates(input.startDate, input.endDate);
  if (input.dataset.lineage.sourceId !== "BCB_SGS_11_SELIC" || input.dataset.lineage.validationStatus !== "valid" || !input.dataset.lineage.sourceHashSha256) throw new Error("A série SGS 11 não possui linhagem BCB válida e hasheada.");
  const sorted = [...input.dataset.dataframe].sort((a, b) => a.asOf.localeCompare(b.asOf));
  if (sorted.length !== expectedDates.length || sorted.some((row, index) => row.seriesCode !== 11 || row.unit !== "percent" || row.asOf !== expectedDates[index] || !Number.isFinite(row.valuePct) || row.valuePct <= -100)) throw new Error("A série SGS 11 não contém uma observação diária válida e contínua para cada dia útil bancário do intervalo.");
  if (new Set(sorted.map(row => row.asOf)).size !== sorted.length) throw new Error("A série SGS 11 contém datas duplicadas.");
  const accumulatedFactor = sorted.reduce((factor, row) => factor * (1 + row.valuePct / 100), 1);
  return { method: "BCB_SGS_11_DAILY_OVER_COMPOUND", startDate: input.startDate, endDate: input.endDate, calendarId: "ANBIMA_BANKING_2026", observationCount: sorted.length, accumulatedFactor, accumulatedPct: (accumulatedFactor - 1) * 100, observations: sorted.map(row => ({ asOf: row.asOf, dailyOverPct: row.valuePct })), lineage: { bcb: input.dataset.lineage, calendar: BUSINESS_CALENDARS.ANBIMA_BANKING_2026 }, limitations: ["Capitalização geométrica das observações diárias oficiais da SGS 11 nos dias úteis bancários ANBIMA de 2026.", "Não anualiza a taxa, não constrói curva, não interpola feriados e não substitui observações ausentes.", "O resultado é fator over observado; não é taxa efetiva de um contrato, MTM, valor presente ou recomendação de hedge."] };
}

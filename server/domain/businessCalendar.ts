export type BusinessCalendarId = "B3_TRADING_2026" | "ANBIMA_BANKING_2026";

export type BusinessCalendarLineage = {
  calendarId: BusinessCalendarId;
  year: 2026;
  sourceId: "B3_TRADING_CALENDAR" | "ANBIMA_BANKING_HOLIDAYS";
  sourceUrl: string;
  publishedAt: string | null;
  description: string;
};

type CalendarDefinition = BusinessCalendarLineage & { nonBusinessWeekdays: readonly string[] };

const B3_2026_NON_TRADING_DATES = [
  "2026-01-01", "2026-02-16", "2026-02-17", "2026-04-03", "2026-04-21", "2026-05-01",
  "2026-06-04", "2026-09-07", "2026-10-12", "2026-11-02", "2026-11-20", "2026-12-24",
  "2026-12-25", "2026-12-31",
] as const;

const ANBIMA_2026_BANKING_HOLIDAYS = [
  "2026-01-01", "2026-02-16", "2026-02-17", "2026-04-03", "2026-04-21", "2026-05-01",
  "2026-06-04", "2026-09-07", "2026-10-12", "2026-11-02", "2026-11-15", "2026-11-20", "2026-12-25",
] as const;

export const BUSINESS_CALENDARS: Record<BusinessCalendarId, CalendarDefinition> = {
  B3_TRADING_2026: {
    calendarId: "B3_TRADING_2026",
    year: 2026,
    sourceId: "B3_TRADING_CALENDAR",
    sourceUrl: "https://www.b3.com.br/pt_br/noticias/calendario-de-negociacao-da-b3-confira-o-funcionamento-da-bolsa-em-2026.htm",
    publishedAt: "2026-01-09",
    description: "Dias sem sessão de negociação divulgados pela B3 para 2026; 18/02 conta como dia útil, pois a negociação inicia em horário especial.",
    nonBusinessWeekdays: B3_2026_NON_TRADING_DATES,
  },
  ANBIMA_BANKING_2026: {
    calendarId: "ANBIMA_BANKING_2026",
    year: 2026,
    sourceId: "ANBIMA_BANKING_HOLIDAYS",
    sourceUrl: "https://www.anbima.com.br/feriados/fer_nacionais/2026.asp",
    publishedAt: null,
    description: "Feriados nacionais bancários publicados pela ANBIMA para 2026; finais de semana também não são dias úteis.",
    nonBusinessWeekdays: ANBIMA_2026_BANKING_HOLIDAYS,
  },
};

function asUtcDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("A data deve usar o formato AAAA-MM-DD.");
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) throw new Error("A data informada é inválida.");
  return parsed;
}

function formatUtcDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function assertSupportedYear(date: Date, definition: CalendarDefinition) {
  if (date.getUTCFullYear() !== definition.year) {
    throw new Error(`O calendário ${definition.calendarId} está validado somente para ${definition.year}; nenhum feriado de outro ano foi inferido.`);
  }
}

export function isBusinessDay(date: string, calendarId: BusinessCalendarId) {
  const definition = BUSINESS_CALENDARS[calendarId];
  const parsed = asUtcDate(date);
  assertSupportedYear(parsed, definition);
  const weekday = parsed.getUTCDay();
  if (weekday === 0 || weekday === 6) return false;
  return !definition.nonBusinessWeekdays.includes(date);
}

export function addBusinessDays(date: string, businessDays: number, calendarId: BusinessCalendarId) {
  if (!Number.isInteger(businessDays)) throw new Error("A quantidade de dias úteis deve ser inteira.");
  const definition = BUSINESS_CALENDARS[calendarId];
  const cursor = asUtcDate(date);
  assertSupportedYear(cursor, definition);
  if (businessDays === 0) return date;
  const direction = businessDays > 0 ? 1 : -1;
  let remaining = Math.abs(businessDays);
  for (let attempts = 0; attempts < 370 && remaining > 0; attempts += 1) {
    cursor.setUTCDate(cursor.getUTCDate() + direction);
    assertSupportedYear(cursor, definition);
    if (isBusinessDay(formatUtcDate(cursor), calendarId)) remaining -= 1;
  }
  if (remaining > 0) throw new Error("Não foi possível deslocar a data dentro da cobertura anual do calendário oficial.");
  return formatUtcDate(cursor);
}

/** Conta os dias úteis em (dataInicial, dataFinal], isto é, início exclusivo e fim inclusivo. */
export function businessDaysBetween(dateStart: string, dateEnd: string, calendarId: BusinessCalendarId) {
  const definition = BUSINESS_CALENDARS[calendarId];
  const start = asUtcDate(dateStart);
  const end = asUtcDate(dateEnd);
  assertSupportedYear(start, definition);
  assertSupportedYear(end, definition);
  if (end.getTime() < start.getTime()) throw new Error("A data final deve ser igual ou posterior à data inicial.");
  let count = 0;
  const cursor = new Date(start);
  while (cursor.getTime() < end.getTime()) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (isBusinessDay(formatUtcDate(cursor), calendarId)) count += 1;
  }
  return count;
}

export function settlementDateD1(tradeDate: string, calendarId: BusinessCalendarId) {
  return addBusinessDays(tradeDate, 1, calendarId);
}

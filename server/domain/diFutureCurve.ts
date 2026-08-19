import { businessDaysBetween, type BusinessCalendarId } from "./businessCalendar";
import type { B3MarketDataset, B3MarketObservationRow } from "./dataframes";

export type DiFutureCurveIssue = {
  code: "B3_ASSOCIATION_BLOCKED" | "MIXED_ASOF" | "MISSING_DI1_RATE" | "INVALID_DI1_MATURITY" | "BUSINESS_DAYS_OUTSIDE_CALENDAR_COVERAGE";
  severity: "error" | "warning";
  instrumentId: string | null;
  message: string;
};

export type DiFutureCurvePoint = {
  curve_point_id: string;
  asof: string;
  instrument_id: string;
  symbol: string;
  maturity: string;
  adjusted_rate_pct_aa252: number;
  business_days_to_maturity: number | null;
  business_days_status: "validated" | "not_available_outside_calendar_coverage";
  quotation_convention: "EFFECTIVE_ANNUAL_RATE_AA_252_PUBLISHED_BY_B3";
  source_file: string;
  source_hash_sha256: string | null;
};

export type DiFutureCurveDataset = {
  dataframe: DiFutureCurvePoint[];
  status: "valid_market_vertices" | "warning" | "blocked";
  asof: string | null;
  calendarId: BusinessCalendarId;
  issues: DiFutureCurveIssue[];
  limitations: readonly string[];
};

function calculateBusinessDays(asof: string, maturity: string, calendarId: BusinessCalendarId): Pick<DiFutureCurvePoint, "business_days_to_maturity" | "business_days_status"> {
  try {
    return { business_days_to_maturity: businessDaysBetween(asof, maturity, calendarId), business_days_status: "validated" };
  } catch (error) {
    if (error instanceof Error && error.message.includes("validado somente")) return { business_days_to_maturity: null, business_days_status: "not_available_outside_calendar_coverage" };
    throw error;
  }
}

/**
 * Constrói somente os vértices de taxa DI efetivamente publicados nos arquivos
 * B3 associados ao cadastro. Não interpola curva, não deriva taxa de PU e não
 * gera taxa forward: esses passos exigem convenção e insumos adicionais.
 */
export function buildDiFutureCurveVertices(market: B3MarketDataset, calendarId: BusinessCalendarId = "B3_TRADING_2026"): DiFutureCurveDataset {
  const issues: DiFutureCurveIssue[] = [];
  if (market.associationStatus !== "valid") {
    issues.push({ code: "B3_ASSOCIATION_BLOCKED", severity: "error", instrumentId: null, message: "A curva DI foi bloqueada porque o PriceReport e o InstrumentReport não estão associados na mesma data-base." });
    return { dataframe: [], status: "blocked", asof: null, calendarId, issues, limitations: ["Nenhum vértice é produzido quando a associação PriceReport/InstrumentReport é inválida."] };
  }

  const diRows = market.dataframe.filter((row): row is B3MarketObservationRow => row.family === "DI1" && row.instrumentType === "FUTURE");
  const asOfValues = Array.from(new Set(diRows.map(row => row.tradeDate)));
  if (asOfValues.length > 1) {
    issues.push({ code: "MIXED_ASOF", severity: "error", instrumentId: null, message: "A curva DI exige um único pregão B3; foram encontradas observações com datas-base diferentes." });
    return { dataframe: [], status: "blocked", asof: null, calendarId, issues, limitations: ["Não é permitido combinar vértices de pregões B3 distintos."] };
  }

  const asof = asOfValues[0] ?? null;
  const dataframe: DiFutureCurvePoint[] = [];
  for (const row of diRows) {
    if (row.adjustedQuoteTax === null || !Number.isFinite(row.adjustedQuoteTax)) {
      issues.push({ code: "MISSING_DI1_RATE", severity: "warning", instrumentId: row.instrumentId, message: `O DI1 ${row.symbol} não possui taxa de ajuste B3 materializada; o vértice foi excluído.` });
      continue;
    }
    if (!row.maturity || !asof || row.maturity <= asof) {
      issues.push({ code: "INVALID_DI1_MATURITY", severity: "warning", instrumentId: row.instrumentId, message: `O DI1 ${row.symbol} não possui vencimento futuro válido em relação à data-base.` });
      continue;
    }
    const businessDays = calculateBusinessDays(asof, row.maturity, calendarId);
    if (businessDays.business_days_status === "not_available_outside_calendar_coverage") {
      issues.push({ code: "BUSINESS_DAYS_OUTSIDE_CALENDAR_COVERAGE", severity: "warning", instrumentId: row.instrumentId, message: `O vencimento ${row.maturity} está fora da cobertura do calendário ${calendarId}; a taxa B3 é preservada, mas o DU não é inferido.` });
    }
    dataframe.push({
      curve_point_id: `DI1_${row.instrumentId}_${asof}`,
      asof,
      instrument_id: row.instrumentId,
      symbol: row.symbol,
      maturity: row.maturity,
      adjusted_rate_pct_aa252: row.adjustedQuoteTax,
      ...businessDays,
      quotation_convention: "EFFECTIVE_ANNUAL_RATE_AA_252_PUBLISHED_BY_B3",
      source_file: row.sourceFile,
      source_hash_sha256: row.sourceHashSha256,
    });
  }
  dataframe.sort((a, b) => a.maturity.localeCompare(b.maturity) || a.instrument_id.localeCompare(b.instrument_id));
  const status = dataframe.length === 0 ? "warning" : issues.some(issue => issue.severity === "warning") ? "warning" : "valid_market_vertices";
  return {
    dataframe,
    status,
    asof,
    calendarId,
    issues,
    limitations: [
      "A saída contém vértices observados de taxa DI1 publicada pela B3, não uma curva interpolada.",
      "Nenhuma taxa forward, preço teórico, DV01, MTM ou taxa de desconto é inferida a partir destes vértices.",
      "Dias úteis são preenchidos somente dentro da cobertura oficial do calendário selecionado.",
    ],
  };
}

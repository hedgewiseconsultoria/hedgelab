import {
  type B3MarketDataset,
  type B3MarketObservationRow,
  type B3PriceRow,
  type InstrumentMasterRow,
  SUPPORTED_B3_FAMILIES,
  type SupportedB3Family,
} from "./dataframes";

function candidateFamilyFromSymbol(symbol: string): SupportedB3Family | null {
  return SUPPORTED_B3_FAMILIES.find(family => symbol.startsWith(family)) ?? null;
}

export function buildB3MarketDataset(priceRows: B3PriceRow[], instrumentRows: InstrumentMasterRow[]): B3MarketDataset {
  const instrumentById = new Map(instrumentRows.map(row => [row.instrument_id, row]));
  // Alguns boletins oficiais usam identificadores técnicos diferentes entre preço e cadastro.
  // O símbolo TckrSymb é a chave pública comum e deve ser usado como fallback auditável.
  const instrumentBySymbol = new Map<string, InstrumentMasterRow>();
  for (const row of instrumentRows) {
    if (row.symbol && !instrumentBySymbol.has(row.symbol)) instrumentBySymbol.set(row.symbol, row);
  }
  const rows: B3MarketObservationRow[] = [];
  const issues: B3MarketDataset["issues"] = [];
  const missingInstrumentIds = new Set<string>();
  const priceAsOf = priceRows.at(0)?.tradeDate ?? null;
  const instrumentAsOf = instrumentRows.at(0)?.asof ?? null;
  const associationStatus = priceAsOf && instrumentAsOf && priceAsOf !== instrumentAsOf
    ? "blocked_asof_mismatch"
    : "valid";

  if (associationStatus === "blocked_asof_mismatch") {
    issues.push({
      code: "PRICE_INSTRUMENT_ASOF_MISMATCH",
      severity: "error",
      instrumentId: null,
      family: null,
      message: `Associação bloqueada: PriceReport de ${priceAsOf} e InstrumentReport de ${instrumentAsOf} possuem datas-base divergentes.`,
    });
  }

  for (const price of priceRows) {
    if (associationStatus === "blocked_asof_mismatch") continue;
    const instrument = instrumentById.get(price.instrumentId) ?? instrumentBySymbol.get(price.symbol);
    if (!instrument) {
      const candidateFamily = candidateFamilyFromSymbol(price.symbol);
      if (candidateFamily && !missingInstrumentIds.has(price.instrumentId)) {
        missingInstrumentIds.add(price.instrumentId);
        issues.push({ code: "PRICE_INSTRUMENT_NOT_IN_MASTER", severity: "error", instrumentId: price.instrumentId, family: candidateFamily, message: `Observação de preço ${price.symbol} sem correspondência por identificador ou símbolo no InstrumentReport fornecido.` });
      }
      continue;
    }
    const observation: B3MarketObservationRow = {
      ...price,
      family: instrument.family,
      instrumentType: instrument.instrument_type,
      maturity: instrument.maturity,
      optionType: instrument.option_type ?? null,
      exercisePrice: instrument.exercise_price === null || instrument.exercise_price === undefined ? null : (instrument.family === "DOL" && instrument.instrument_type === "OPTION" && instrument.exercise_price > 100 ? instrument.exercise_price / 1_000 : instrument.exercise_price),
      underlyingInstrumentId: instrument.underlying_id,
      instrumentReportAsOf: instrument.asof,
    };
    rows.push(observation);
    if ((observation.instrumentType === "FUTURE" || observation.instrumentType === "OPTION") && !observation.maturity) {
      issues.push({ code: "MISSING_MATURITY_FOR_DERIVATIVE", severity: "error", instrumentId: observation.instrumentId, family: observation.family, message: `Derivativo ${observation.symbol} sem vencimento no InstrumentReport.` });
    }
    if (observation.instrumentType === "OPTION" && !observation.underlyingInstrumentId) {
      issues.push({ code: "OPTION_WITHOUT_UNDERLYING", severity: "error", instrumentId: observation.instrumentId, family: observation.family, message: `Opção ${observation.symbol} sem ativo-objeto no InstrumentReport.` });
    }
  }

  const coverage = SUPPORTED_B3_FAMILIES.map(family => {
    const familyRows = rows.filter(row => row.family === family);
    if (familyRows.length === 0) issues.push({ code: "FAMILY_WITHOUT_PRICE_RECORD", severity: "warning", instrumentId: null, family, message: `Nenhuma observação de preço associada à família ${family} no conjunto carregado.` });
    return {
      family,
      records: familyRows.length,
      futureRecords: familyRows.filter(row => row.instrumentType === "FUTURE").length,
      optionRecords: familyRows.filter(row => row.instrumentType === "OPTION").length,
      recordsWithTradePrice: familyRows.filter(row => row.lastPrice !== null || row.tradeAveragePrice !== null || row.firstPrice !== null).length,
      recordsWithAdjustedQuote: familyRows.filter(row => row.adjustedQuote !== null || row.adjustedQuoteTax !== null).length,
    };
  });
  return { dataframe: rows, coverage, issues, associationStatus };
}

/**
 * Seleciona contratos compatíveis com o horizonte econômico informado.
 * A prioridade é: vencimento exato, mesmo mês, primeiro vencimento posterior
 * e, somente como último recurso, vencimento anterior mais próximo. A função
 * nunca inventa uma série: retorna apenas observações presentes no boletim.
 */
export function selectCompatibleB3Contracts(
  rows: B3MarketObservationRow[],
  family: SupportedB3Family,
  horizonDate: string,
  instrumentType?: "FUTURE" | "OPTION",
): B3MarketObservationRow[] {
  const candidates = rows
    .filter(row => row.family === family && (!instrumentType || row.instrumentType === instrumentType) && Boolean(row.maturity))
    .filter(row => row.lastPrice !== null || row.tradeAveragePrice !== null || row.adjustedQuote !== null)
    .sort((left, right) => String(left.maturity).localeCompare(String(right.maturity)) || left.symbol.localeCompare(right.symbol));
  if (!candidates.length) return [];

  const exact = candidates.filter(row => row.maturity === horizonDate);
  if (exact.length) return exact;
  const month = horizonDate.slice(0, 7);
  const sameMonth = candidates.filter(row => row.maturity?.slice(0, 7) === month);
  if (sameMonth.length) return sameMonth;

  const forward = candidates.filter(row => String(row.maturity) >= horizonDate);
  return forward.length ? forward : candidates.slice(-1);
}

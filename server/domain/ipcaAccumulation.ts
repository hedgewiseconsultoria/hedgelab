export type IpcaIndexOfficialObservation = {
  aggregateId: "1737";
  variableId: "2266";
  unit: "Número-índice";
  period: string;
  localityId: string;
  localityName: string;
  value: number | null;
  unavailableSymbol: string | null;
};

export type IpcaIndexOfficialDataset = {
  dataframe: IpcaIndexOfficialObservation[];
  lineage: { sourceId: "IBGE_IPCA"; sourceUrl: string; sourceFile: string; extractedAtUtc: string; sourceAsOf: string | null; sourceHashSha256: string | null; parserVersion: string; validationStatus: "valid" | "warning" | "invalid" };
};

export type IpcaAccumulatedResult = {
  method: "IBGE_IPCA_1737_2266_INDEX_RATIO";
  startPeriod: string;
  endPeriod: string;
  basePeriod: string;
  localityId: string;
  localityName: string;
  baseIndex: number;
  finalIndex: number;
  accumulatedFactor: number;
  accumulatedPct: number;
  indexObservations: Array<{ period: string; indexValue: number; sourceUrl: string; sourceFile: string; sourceAsOf: string; sourceHashSha256: string }>;
  limitations: string[];
};

function assertPeriod(value: string, label: string) {
  if (!/^\d{6}$/.test(value) || Number(value.slice(4)) < 1 || Number(value.slice(4)) > 12) throw new Error(`${label} deve seguir AAAAMM com mês válido.`);
}

export function previousMonthlyPeriod(period: string): string {
  assertPeriod(period, "Competência");
  const year = Number(period.slice(0, 4));
  const month = Number(period.slice(4, 6));
  return month === 1 ? `${year - 1}12` : `${year}${String(month - 1).padStart(2, "0")}`;
}

/** Aplica o quociente de números-índice oficialmente descrito pelo IBGE; não compõe percentuais mensais arredondados. */
export function calculateIpcaAccumulated(input: { startPeriod: string; endPeriod: string; localityId: string; datasets: IpcaIndexOfficialDataset[] }): IpcaAccumulatedResult {
  assertPeriod(input.startPeriod, "Período inicial");
  assertPeriod(input.endPeriod, "Período final");
  if (input.startPeriod > input.endPeriod) throw new Error("O período inicial não pode ser posterior ao período final.");
  const basePeriod = previousMonthlyPeriod(input.startPeriod);
  const select = (period: string) => {
    const dataset = input.datasets.find(candidate => candidate.lineage.sourceAsOf === `${period.slice(0, 4)}-${period.slice(4, 6)}-01`);
    if (!dataset || dataset.lineage.validationStatus !== "valid" || !dataset.lineage.sourceHashSha256) throw new Error(`O número-índice de ${period} não possui linhagem IBGE válida com hash.`);
    const rows = dataset.dataframe.filter(row => row.period === period && row.localityId === input.localityId && row.aggregateId === "1737" && row.variableId === "2266" && row.unit === "Número-índice");
    if (rows.length !== 1 || rows[0]!.value === null || rows[0]!.unavailableSymbol !== null || !Number.isFinite(rows[0]!.value) || rows[0]!.value! <= 0) throw new Error(`O número-índice de ${period} não está disponível de forma única e positiva para a localidade selecionada.`);
    return { observation: rows[0]!, lineage: dataset.lineage };
  };
  const base = select(basePeriod);
  const final = select(input.endPeriod);
  if (base.observation.localityName !== final.observation.localityName) throw new Error("Os números-índice IPCA possuem localidades inconsistentes.");
  const accumulatedFactor = final.observation.value! / base.observation.value!;
  return { method: "IBGE_IPCA_1737_2266_INDEX_RATIO", startPeriod: input.startPeriod, endPeriod: input.endPeriod, basePeriod, localityId: input.localityId, localityName: final.observation.localityName, baseIndex: base.observation.value!, finalIndex: final.observation.value!, accumulatedFactor, accumulatedPct: (accumulatedFactor - 1) * 100, indexObservations: [base, final].map(record => ({ period: record.observation.period, indexValue: record.observation.value!, sourceUrl: record.lineage.sourceUrl, sourceFile: record.lineage.sourceFile, sourceAsOf: record.lineage.sourceAsOf!, sourceHashSha256: record.lineage.sourceHashSha256! })), limitations: ["Quociente entre o número-índice do mês final e o número-índice do mês anterior ao mês inicial, conforme a metodologia publicada pelo IBGE.", "Não representa correção jurídica de contrato, projeção, inflação implícita, valor presente ou índice substituto.", "O cálculo é bloqueado diante de número-índice ausente, localidade divergente ou linhagem sem hash válido."] };
}

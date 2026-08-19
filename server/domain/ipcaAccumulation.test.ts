import { describe, expect, it } from "vitest";
import { calculateIpcaAccumulated, previousMonthlyPeriod, type IpcaIndexOfficialDataset } from "./ipcaAccumulation";

function dataset(period: string, index: number | null, localityId = "1"): IpcaIndexOfficialDataset {
  return { dataframe: [{ aggregateId: "1737", variableId: "2266", unit: "Número-índice", period, localityId, localityName: "Brasil", value: index, unavailableSymbol: index === null ? "..." : null }], lineage: { sourceId: "IBGE_IPCA", sourceUrl: `https://ibge.example/${period}`, sourceFile: `1737-2266-${period}.json`, extractedAtUtc: "2026-08-19T00:00:00.000Z", sourceAsOf: `${period.slice(0, 4)}-${period.slice(4, 6)}-01`, sourceHashSha256: "a".repeat(64), parserVersion: "ibge-sidra-agregados-v3-1737-index-v1", validationStatus: "valid" } };
}

describe("calculateIpcaAccumulated", () => {
  it("calcula pelo quociente do índice final sobre o índice do mês anterior ao início", () => {
    const result = calculateIpcaAccumulated({ startPeriod: "202601", endPeriod: "202603", localityId: "1", datasets: [dataset("202512", 100), dataset("202603", 101.204706)] });
    expect(previousMonthlyPeriod("202601")).toBe("202512");
    expect(result.method).toBe("IBGE_IPCA_1737_2266_INDEX_RATIO");
    expect(result.accumulatedFactor).toBeCloseTo(1.01204706, 8);
    expect(result.accumulatedPct).toBeCloseTo(1.204706, 6);
  });

  it("bloqueia índice indisponível ou linhagem sem hash", () => {
    expect(() => calculateIpcaAccumulated({ startPeriod: "202601", endPeriod: "202602", localityId: "1", datasets: [dataset("202512", 100), dataset("202602", null)] })).toThrow(/número-índice.*disponível/i);
    expect(() => calculateIpcaAccumulated({ startPeriod: "202601", endPeriod: "202602", localityId: "1", datasets: [dataset("202512", 100)] })).toThrow(/linhagem IBGE válida/i);
  });
});

import { createReadStream, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseB3PriceReportXmlStream } from "./b3PriceReportParser";

const fullReportFile = process.env.B3_PRICE_REPORT_FILE;
const simplifiedReportFile = process.env.B3_SIMPLIFIED_PRICE_REPORT_FILE;
const realAsOf = process.env.B3_REAL_ASOF ?? "2026-08-14";
const realPriceHash = process.env.B3_PRICE_REPORT_SHA256 ?? "ca32c73b86d7ab852bd61c07f751c92c113a7e1ddfa384aede35b90a64f20e2e";
const realSimplifiedHash = process.env.B3_SIMPLIFIED_PRICE_REPORT_SHA256 ?? "7d40d0cdb233a2b4f8fca44c5dbc30bccf0d21d29188158bf30421094dc4a771";
const fullReportTest = fullReportFile && existsSync(fullReportFile) ? it : it.skip;
const simplifiedReportTest = simplifiedReportFile && existsSync(simplifiedReportFile) ? it : it.skip;

function context(sourceFile: string, expectedReportType: "BVBG.086.01" | "BVBG.187.01", sourceHashSha256: string) {
  return {
    sourceId: "B3_PUBLIC_FILES" as const,
    sourceUrl: process.env.B3_REAL_SOURCE_URL ?? "https://www.b3.com.br/pesquisapregao/download?filelist=PR260814.zip,SPRD260814.zip,",
    sourceFile,
    extractedAtUtc: "2026-08-17T21:00:00.000Z",
    sourceAsOf: realAsOf,
    sourceHashSha256,
    expectedReportType,
  };
}

describe("BVBG.086.01 e BVBG.187.01 — integração com arquivos oficiais", () => {
  fullReportTest("normaliza PriceReport real e encontra famílias de futuros, opções e commodities", async () => {
    const dataset = await parseB3PriceReportXmlStream(createReadStream(fullReportFile!), context(fullReportFile!.split("/").at(-1)!, "BVBG.086.01", realPriceHash));
    expect(dataset.lineage.validationStatus).toBe("valid");
    expect(dataset.header).toMatchObject({ reportType: "BVBG.086.01", messageType: "BVMF.217.01" });
    expect(dataset.dataframe.length).toBeGreaterThan(60_000);
    expect(dataset.dataframe.some(row => row.symbol === "DI1Z28" && row.adjustedQuoteTax !== null)).toBe(true);
    expect(dataset.dataframe.some(row => row.symbol === "WDOX26")).toBe(true);
    expect(dataset.dataframe.some(row => row.symbol === "DOLF29")).toBe(true);
    expect(dataset.dataframe.some(row => row.symbol === "BGIU26")).toBe(true);
    expect(dataset.dataframe.some(row => row.symbol === "CCMX27")).toBe(true);
  }, 180_000);

  simplifiedReportTest("normaliza DerivativesSimplifiedPriceReport real e preserva campos ausentes como nulos", async () => {
    const dataset = await parseB3PriceReportXmlStream(createReadStream(simplifiedReportFile!), context(simplifiedReportFile!.split("/").at(-1)!, "BVBG.187.01", realSimplifiedHash));
    expect(dataset.lineage.validationStatus).toBe("valid");
    expect(dataset.header).toMatchObject({ reportType: "BVBG.187.01", messageType: "BVMF.217.01" });
    expect(dataset.dataframe.length).toBeGreaterThan(2_000);
    expect(dataset.dataframe.some(row => row.bestBidPrice !== null)).toBe(false);
    expect(dataset.dataframe.some(row => row.nationalFinancialVolume !== null)).toBe(false);
  }, 120_000);
});

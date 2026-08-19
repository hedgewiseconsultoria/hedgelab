import { createReadStream, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseB3InstrumentXmlStream } from "../ingestion/b3InstrumentParser";
import { parseB3PriceReportXmlStream } from "../ingestion/b3PriceReportParser";
import { buildB3MarketDataset } from "./b3MarketDataset";

const instrumentFile = process.env.B3_INSTRUMENT_FILE;
const priceFile = process.env.B3_PRICE_REPORT_FILE;
const integrationTest = instrumentFile && priceFile && existsSync(instrumentFile) && existsSync(priceFile) ? it : it.skip;

describe("DataFrame de mercado B3 — integração com arquivos oficiais", () => {
  integrationTest("associa preços e cadastro quando os arquivos oficiais reais têm a mesma data-base", async () => {
    const instruments = await parseB3InstrumentXmlStream(createReadStream(instrumentFile!), {
      sourceId: "B3_PUBLIC_FILES",
      sourceUrl: "https://www.b3.com.br/pesquisapregao/download?filelist=IN260813.zip,",
      sourceFile: instrumentFile!.split("/").at(-1)!,
      extractedAtUtc: "2026-08-17T22:42:00.000Z",
      sourceAsOf: "2026-08-13",
      sourceHashSha256: "d2a1aca58567fbc3a1cd23c40617902d92fc1868fcb5e0a7d9df621688946e5d",
    });
    const prices = await parseB3PriceReportXmlStream(createReadStream(priceFile!), {
      sourceId: "B3_PUBLIC_FILES",
      sourceUrl: "https://www.b3.com.br/pesquisapregao/download?filelist=PR260813.zip,",
      sourceFile: priceFile!.split("/").at(-1)!,
      extractedAtUtc: "2026-08-17T22:42:00.000Z",
      sourceAsOf: "2026-08-13",
      sourceHashSha256: "cf823459800119a9b8f72803ef77b15845b76d06e83d3e39c670fe7b39587ab0",
      expectedReportType: "BVBG.086.01",
    });
    const market = buildB3MarketDataset(prices.dataframe, instruments.instrumentMasterDataframe);
    expect(prices.lineage.validationStatus).toBe("valid");
    expect(market.associationStatus).toBe("valid");
    expect(market.dataframe.length).toBeGreaterThan(4_000);
    expect(market.issues.some(issue => issue.code === "PRICE_INSTRUMENT_ASOF_MISMATCH")).toBe(false);
  }, 300_000);
});

import { createReadStream, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseB3InstrumentXmlStream } from "./b3InstrumentParser";

const realFilePath = process.env.B3_INSTRUMENT_FILE;
const realAsOf = process.env.B3_REAL_ASOF ?? "2026-08-17";
const realInstrumentHash = process.env.B3_INSTRUMENT_SHA256 ?? "a4fbe2209d42f7b582dfa6f638bacbd194e5e5ab1c441e7b379ab69394af8c60";
const integrationTest = realFilePath && existsSync(realFilePath) ? it : it.skip;

describe("BVBG.028.02 — integração com arquivo oficial", () => {
  integrationTest("normaliza o arquivo recuperado e preserva a linhagem de extração", async () => {
    const dataset = await parseB3InstrumentXmlStream(createReadStream(realFilePath!), {
      sourceId: "B3_PUBLIC_FILES",
      sourceUrl: process.env.B3_REAL_SOURCE_URL ?? "https://www.b3.com.br/pt_br/market-data-e-indices/servicos-de-dados/market-data/historico/boletins-diarios/pesquisa-por-pregao/pesquisa-por-pregao/",
      sourceFile: realFilePath!.split("/").at(-1)!,
      extractedAtUtc: "2026-08-17T20:47:00.000Z",
      sourceAsOf: realAsOf,
      sourceHashSha256: realInstrumentHash,
    });

    expect(dataset.dataframe.length).toBeGreaterThan(0);
    expect(dataset.coverage.find(item => item.family === "DI1")?.records).toBeGreaterThan(0);
    expect(dataset.coverage.find(item => item.family === "DOL")?.records).toBeGreaterThan(0);
    expect(dataset.instrumentMasterDataframe.every(item => item.contract_size === null)).toBe(true);
    expect(dataset.lineage.sourceHashSha256).toBe(realInstrumentHash);
  }, 120_000);
});

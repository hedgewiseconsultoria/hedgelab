import { Readable } from "node:stream";
import { describe, expect, it } from "vitest";
import { parseB3PriceReportXmlStream } from "./b3PriceReportParser";

function xml(reportType: "BVBG.086.01" | "BVBG.187.01", priceFields: string) {
  return `<?xml version="1.0"?><Document><BizFileHdr><Xchg><BizGrpDesc><BizGrpDtls><BizGrpTp>${reportType}</BizGrpTp><TtlNbOfMsg>1</TtlNbOfMsg><CreDtAndTm>2026-08-14T20:00:00</CreDtAndTm></BizGrpDtls><MsgTpDef><MsgDefIdr>BVMF.217.01</MsgDefIdr></MsgTpDef></BizGrpDesc><BizGrp><Document><PricRpt><TradDt><Dt>2026-08-14</Dt></TradDt><SctyId><TckrSymb>DI1Z28</TckrSymb></SctyId><FinInstrmId><OthrId><Id>100000250782</Id></OthrId><PlcOfListg><MktIdrCd>BVMF</MktIdrCd></PlcOfListg></FinInstrmId><TradDtls><TradQty>105</TradQty></TradDtls><FinInstrmAttrbts>${priceFields}</FinInstrmAttrbts></PricRpt></Document></BizGrp></Xchg></BizFileHdr></Document>`;
}

const context = {
  sourceId: "B3_PUBLIC_FILES" as const,
  sourceUrl: "https://www.b3.com.br/pesquisapregao/download?filelist=PR260814.zip,",
  sourceFile: "BVBG.086.01_real.xml",
  extractedAtUtc: "2026-08-17T21:00:00.000Z",
  sourceAsOf: "2026-08-14",
  sourceHashSha256: "hash-real-context",
};

describe("parser B3 PriceReport", () => {
  it("normaliza campos observados no layout completo e preserva moedas", async () => {
    const result = await parseB3PriceReportXmlStream(Readable.from([xml("BVBG.086.01", "<MktDataStrmId>E</MktDataStrmId><OpnIntrst>29008</OpnIntrst><FrstPric Ccy=\"BRL\">14.275</FrstPric><AdjstdQt Ccy=\"BRL\">73656.75</AdjstdQt><AdjstdQtTax Ccy=\"BRL\">14.366</AdjstdQtTax>")]), { ...context, expectedReportType: "BVBG.086.01" });
    expect(result.lineage.validationStatus).toBe("valid");
    expect(result.header).toMatchObject({ reportType: "BVBG.086.01", messageType: "BVMF.217.01", totalMessages: 1 });
    expect(result.dataframe[0]).toMatchObject({ symbol: "DI1Z28", instrumentId: "100000250782", tradeQuantity: 105, firstPrice: 14.275, firstPriceCurrency: "BRL", adjustedQuote: 73656.75, adjustedQuoteTax: 14.366 });
  });

  it("mantém nulos os campos não enviados pelo relatório simplificado", async () => {
    const result = await parseB3PriceReportXmlStream(Readable.from([xml("BVBG.187.01", "<OpnIntrst>30</OpnIntrst><AdjstdQt Ccy=\"BRL\">5000</AdjstdQt>")]), { ...context, sourceFile: "BVBG.187.01_real.xml", expectedReportType: "BVBG.187.01" });
    expect(result.lineage.validationStatus).toBe("valid");
    expect(result.dataframe[0]).toMatchObject({ openInterest: 30, adjustedQuote: 5000, lastPrice: null, nationalFinancialVolume: null, bestBidPrice: null });
  });

  it("bloqueia arquivo cujo tipo do cabeçalho diverge do contexto informado", async () => {
    const result = await parseB3PriceReportXmlStream(Readable.from([xml("BVBG.187.01", "")]), { ...context, expectedReportType: "BVBG.086.01" });
    expect(result.lineage.validationStatus).toBe("invalid");
    expect(result.issues.some(issue => issue.code === "PRICE_REPORT_TYPE_MISMATCH")).toBe(true);
  });

  it("aceita bytes ISO-8859-1 quando esta é a codificação declarada pelo XML B3", async () => {
    const latin1Xml = xml("BVBG.086.01", "<AdjstdQtTax Ccy=\"BRL\">14.366</AdjstdQtTax>")
      .replace('version="1.0"', 'version="1.0" encoding="ISO-8859-1"')
      .replace("<Document>", "<Document><AuditLabel>cotaçâo</AuditLabel>");
    const result = await parseB3PriceReportXmlStream(Readable.from([Buffer.from(latin1Xml, "latin1")]), { ...context, expectedReportType: "BVBG.086.01" });

    expect(result.lineage.validationStatus).toBe("valid");
    expect(result.dataframe[0]).toMatchObject({ symbol: "DI1Z28", adjustedQuoteTax: 14.366 });
  });

  it("não interrompe o PriceReport quando bytes legados surgem fora dos campos estruturais", async () => {
    const declaredUtf8 = xml("BVBG.086.01", "<AdjstdQtTax Ccy=\"BRL\">14.366</AdjstdQtTax>")
      .replace("<Document>", "<Document><AuditLabel>cotação</AuditLabel>");
    const legacyBytePayload = Buffer.from(declaredUtf8, "latin1");
    const result = await parseB3PriceReportXmlStream(Readable.from([legacyBytePayload]), { ...context, expectedReportType: "BVBG.086.01" });

    expect(result.lineage.validationStatus).toBe("valid");
    expect(result.dataframe[0]).toMatchObject({ symbol: "DI1Z28", adjustedQuoteTax: 14.366 });
  });
});

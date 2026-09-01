import { Readable } from "node:stream";
import { describe, expect, it } from "vitest";
import { parseB3InstrumentXmlStream } from "./b3InstrumentParser";

const TEST_CONTEXT = {
  sourceId: "B3_PUBLIC_FILES" as const,
  sourceUrl: "https://example.invalid/synthetic-test",
  sourceFile: "synthetic-bvbg-028-02.xml",
  extractedAtUtc: "2026-08-17T00:00:00.000Z",
  sourceAsOf: "2026-08-17",
  sourceHashSha256: "synthetic-test-only",
};

const XML_FIXTURE = `<?xml version="1.0" encoding="utf-8"?>
<Document>
  <Instrm>
    <RptParams><ActvtyInd>true</ActvtyInd><RptDtAndTm><Dt>2026-08-17</Dt></RptDtAndTm></RptParams>
    <FinInstrmId><OthrId><Id>300000055524</Id></OthrId></FinInstrmId>
    <FinInstrmAttrCmon><Asst>DI1</Asst><AsstDesc>Taxa DI</AsstDesc><Desc>DI DE 1 DIA</Desc></FinInstrmAttrCmon>
    <InstrmInf><FutrCtrctsInf>
      <TckrSymb>DI1F41</TckrSymb><XprtnDt>2041-01-02</XprtnDt><BaseCd>252</BaseCd>
      <ISIN>BRBMEFD1I8T4</ISIN><TradgCcy>BRL</TradgCcy><CtrctMltplr>1.000000000</CtrctMltplr>
      <AsstQtnQty>1.000000000</AsstQtnQty><AllcnRndLot>1</AllcnRndLot>
      <UndrlygInstrmId><OthrId><Id>9800334</Id></OthrId></UndrlygInstrmId>
    </FutrCtrctsInf></InstrmInf>
  </Instrm>
  <Instrm>
    <RptParams><ActvtyInd>true</ActvtyInd><RptDtAndTm><Dt>2026-08-17</Dt></RptDtAndTm></RptParams>
    <FinInstrmId><OthrId><Id>300000051649</Id></OthrId></FinInstrmId>
    <FinInstrmAttrCmon><Asst>DOL</Asst><AsstDesc>Dólar Comercial</AsstDesc><Desc>OPÇÕES DE DOLAR COMERCIAL</Desc></FinInstrmAttrCmon>
    <InstrmInf><OptnOnSpotAndFutrsInf>
      <TckrSymb>DOLJ27P006950</TckrSymb><ExrcPric>6950</ExrcPric><ExrcStyle>EURO</ExrcStyle><XprtnDt>2027-04-01</XprtnDt>
      <OptnTp>PUTT</OptnTp><CtrctMltplr>50.000000000</CtrctMltplr><AsstQtnQty>1000.000000000</AsstQtnQty>
      <AllcnRndLot>1</AllcnRndLot><ISIN>BRBMEFVDE835</ISIN><TradgCcy>BRL</TradgCcy>
      <UndrlygInstrmId><OthrId><Id>9800342</Id></OthrId></UndrlygInstrmId>
    </OptnOnSpotAndFutrsInf></InstrmInf>
  </Instrm>
  <Instrm>
    <FinInstrmId><OthrId><Id>not-supported</Id></OthrId></FinInstrmId>
    <FinInstrmAttrCmon><Asst>XYZ</Asst></FinInstrmAttrCmon>
  </Instrm>
</Document>`;

describe("parseB3InstrumentXmlStream", () => {
  it("normaliza futuros e opções das famílias autorizadas sem inferir tamanho de contrato", async () => {
    const dataset = await parseB3InstrumentXmlStream(Readable.from([XML_FIXTURE]), TEST_CONTEXT);

    expect(dataset.dataframe).toHaveLength(2);
    expect(dataset.coverage.find(item => item.family === "DI1")?.records).toBe(1);
    expect(dataset.coverage.find(item => item.family === "DOL")?.records).toBe(1);

    const di1 = dataset.dataframe.find(item => item.symbol === "DI1F41");
    expect(di1).toMatchObject({
      instrumentId: "300000055524",
      family: "DI1",
      instrumentType: "FUTURE",
      maturity: "2041-01-02",
      currency: "BRL",
      underlyingInstrumentId: "9800334",
    });

    const dolOption = dataset.dataframe.find(item => item.symbol === "DOLJ27P006950");
    expect(dolOption).toMatchObject({
      family: "DOL",
      instrumentType: "OPTION",
      optionType: "PUT",
      exerciseStyle: "EURO",
      exercisePrice: 6950,
      underlyingInstrumentId: "9800342",
    });

    expect(dataset.instrumentMasterDataframe[0]?.contract_size).toBeNull();
    expect(dataset.instrumentMasterDataframe[0]?.contract_size_status).toBe("not_inferred_from_bvbg_028_02");
    expect(dataset.lineage.parserVersion).toBe("b3-bvbg-028-02-v1");
  });

  it("bloqueia opções sem ativo-objeto identificado", async () => {
    const optionWithoutUnderlying = XML_FIXTURE.replace(
      "<UndrlygInstrmId><OthrId><Id>9800342</Id></OthrId></UndrlygInstrmId>",
      "",
    );
    const dataset = await parseB3InstrumentXmlStream(Readable.from([optionWithoutUnderlying]), TEST_CONTEXT);

    expect(dataset.lineage.validationStatus).toBe("invalid");
    expect(dataset.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "OPTION_UNDERLYING_MISSING",
          severity: "error",
          instrumentId: "300000051649",
        }),
      ]),
    );
  });

  it("normaliza o cadastro quando o XML B3 declara ISO-8859-1", async () => {
    const latin1Fixture = XML_FIXTURE
      .replace('encoding="utf-8"', 'encoding="ISO-8859-1"')
      .replace("<Document>", "<Document><AuditLabel>cotaçâo</AuditLabel>");
    const dataset = await parseB3InstrumentXmlStream(Readable.from([Buffer.from(latin1Fixture, "latin1")]), TEST_CONTEXT);

    expect(dataset.lineage.validationStatus).toBe("valid");
    expect(dataset.dataframe.map(item => item.symbol)).toEqual(["DI1F41", "DOLJ27P006950"]);
  });

  it("não interrompe o cadastro quando bytes legados surgem fora dos campos estruturais", async () => {
    const declaredUtf8WithLegacyByte = XML_FIXTURE.replace("<Document>", "<Document><AuditLabel>cotação</AuditLabel>");
    const dataset = await parseB3InstrumentXmlStream(Readable.from([Buffer.from(declaredUtf8WithLegacyByte, "latin1")]), TEST_CONTEXT);

    expect(dataset.lineage.validationStatus).toBe("valid");
    expect(dataset.dataframe.map(item => item.symbol)).toEqual(["DI1F41", "DOLJ27P006950"]);
  });
});

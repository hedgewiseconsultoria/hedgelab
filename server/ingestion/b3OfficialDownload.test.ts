import AdmZip from "adm-zip";
import { describe, expect, it } from "vitest";
import { collectB3OfficialPriceReport, collectB3OfficialReport } from "./b3OfficialDownload";

function nestedZip(filename: string, xmlFilename: string) {
  const inner = new AdmZip();
  inner.addFile(xmlFilename, Buffer.from("<?xml version=\"1.0\"?><Document />"));
  const outer = new AdmZip();
  outer.addFile(filename, inner.toBuffer());
  return outer.toBuffer();
}

describe("coletor oficial B3", () => {
  it("usa o fluxo publicado, preserva hash e extrai somente XMLs do tipo solicitado", async () => {
    const body = nestedZip("PR260814.zip", "BVBG.086.01_BV000328.xml");
    const output = await collectB3OfficialPriceReport({
      reportType: "BVBG.086.01",
      asOf: "2026-08-14",
      fetcher: async url => {
        expect(String(url)).toContain("https://www.b3.com.br/pesquisapregao/download?filelist=PR260814.zip%2C");
        return new Response(body, { status: 200 });
      },
    });
    expect(output.outerArchive.sha256).toHaveLength(64);
    expect(output.innerArchive.filename).toBe("PR260814.zip");
    expect(output.xmlFiles).toHaveLength(1);
    expect(output.xmlFiles[0]?.filename).toBe("BVBG.086.01_BV000328.xml");
    expect(output.validationStatus).toBe("downloaded");
  });

  it("rejeita data-base fora do formato oficial adotado pelo fluxo", async () => {
    await expect(collectB3OfficialPriceReport({ reportType: "BVBG.187.01", asOf: "14/08/2026" })).rejects.toThrow("AAAA-MM-DD");
  });

  it("rejeita uma página HTML retornada no lugar do arquivo B3 sem publicar dados", async () => {
    await expect(collectB3OfficialPriceReport({
      reportType: "BVBG.086.01",
      asOf: "2026-08-14",
      fetcher: async () => new Response("<!DOCTYPE html><html><body>Indisponível</body></html>", { status: 200 }),
    })).rejects.toThrow("A B3 retornou uma página HTML");
  });

  it("inspeciona o InstrumentReport em modo de metadados sem descompactar o XML", async () => {
    const body = nestedZip("IN260814.zip", "BVBG.028.02_BV000327.xml");
    const output = await collectB3OfficialReport({ reportType: "BVBG.028.02", asOf: "2026-08-14", metadataOnly: true, fetcher: async () => new Response(body, { status: 200 }) });
    expect(output.xmlFiles[0]).toMatchObject({ filename: "BVBG.028.02_BV000327.xml", body: null, sha256: null });
  });

  it("interrompe a coleta com erro explícito quando o endpoint oficial excede o limite configurado", async () => {
    await expect(collectB3OfficialReport({
      reportType: "BVBG.086.01",
      asOf: "2026-08-14",
      timeoutMs: 1,
      fetcher: async (_url, init) => new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
      }),
    })).rejects.toThrow("A B3 não respondeu em 1 ms");
  });

  it("interrompe a leitura quando o endpoint entrega a resposta, mas não conclui o corpo do arquivo", async () => {
    await expect(collectB3OfficialReport({
      reportType: "BVBG.086.01",
      asOf: "2026-08-14",
      timeoutMs: 5,
      fetcher: async (_url, init) => new Response(new ReadableStream({
        start(controller) {
          init?.signal?.addEventListener("abort", () => controller.error(new Error("body aborted")));
        },
      })),
    })).rejects.toThrow("A B3 não respondeu em 5 ms");
  });

  it("tenta novamente falhas transitórias e só publica o arquivo após receber ZIP oficial válido", async () => {
    const body = nestedZip("PR260814.zip", "BVBG.086.01_BV000328.xml");
    let calls = 0;
    const output = await collectB3OfficialPriceReport({
      reportType: "BVBG.086.01",
      asOf: "2026-08-14",
      maxAttempts: 3,
      retryDelayMs: 0,
      fetcher: async () => {
        calls += 1;
        if (calls < 3) throw new Error("falha transitória de rede");
        return new Response(body, { status: 200 });
      },
    });
    expect(calls).toBe(3);
    expect(output.attempts).toBe(3);
    expect(output.outerArchive.sha256).toHaveLength(64);
  });

  it("não repete uma resposta definitiva de arquivo indisponível", async () => {
    let calls = 0;
    await expect(collectB3OfficialPriceReport({
      reportType: "BVBG.086.01",
      asOf: "2026-08-14",
      maxAttempts: 3,
      retryDelayMs: 0,
      fetcher: async () => { calls += 1; return new Response("ausente", { status: 404 }); },
    })).rejects.toThrow("A B3 respondeu 404");
    expect(calls).toBe(1);
  });
});

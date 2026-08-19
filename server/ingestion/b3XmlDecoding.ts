import { StringDecoder } from "node:string_decoder";
import type { Readable } from "node:stream";

type SupportedB3XmlEncoding = "utf8" | "latin1";

function resolveDeclaredEncoding(prefix: Buffer, isEnd: boolean): SupportedB3XmlEncoding | null {
  const header = prefix.subarray(0, Math.min(prefix.length, 4096)).toString("ascii");
  const declarationEnd = header.indexOf("?>");
  if (declarationEnd < 0 && !isEnd && prefix.length < 4096) return null;
  const declaration = declarationEnd >= 0 ? header.slice(0, declarationEnd + 2) : header;
  const match = declaration.match(/\bencoding\s*=\s*["']([^"']+)["']/i);
  const declared = match?.[1]?.trim().toLowerCase().replace(/[_-]/g, "") ?? "utf8";
  if (declared === "utf8") return "utf8";
  if (declared === "iso88591" || declared === "latin1") return "latin1";
  throw new Error(`XML B3 bloqueado: codificação declarada não suportada (${match?.[1] ?? "ausente"}).`);
}

/**
 * Decodifica o XML segundo a declaração do próprio arquivo B3 antes de entregá-lo
 * ao SAX. O parser SAX detecta bytes sem BOM como UTF-8; por isso não deve receber
 * diretamente um XML ISO-8859-1 válido da fonte oficial.
 */
export async function streamB3XmlText(readable: Readable, onText: (text: string) => void): Promise<void> {
  let prefix = Buffer.alloc(0);
  let decoder: StringDecoder | null = null;

  for await (const value of readable) {
    const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value);
    if (decoder) {
      const text = decoder.write(chunk);
      if (text) onText(text);
      continue;
    }

    prefix = Buffer.concat([prefix, chunk]);
    const encoding = resolveDeclaredEncoding(prefix, false);
    if (!encoding) continue;
    decoder = new StringDecoder(encoding);
    const text = decoder.write(prefix);
    prefix = Buffer.alloc(0);
    if (text) onText(text);
  }

  if (!decoder) {
    const encoding = resolveDeclaredEncoding(prefix, true);
    decoder = new StringDecoder(encoding ?? "utf8");
    const text = decoder.write(prefix);
    if (text) onText(text);
  }
  const tail = decoder.end();
  if (tail) onText(tail);
}

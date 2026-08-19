// Preconfigured storage helpers for Manus WebDev templates.
// Fora da infraestrutura Manus, os artefatos podem permanecer apenas na sessão do processo.

import { ENV } from "./_core/env";

type SessionStoredObject = { data: Buffer; contentType: string };
const sessionStorage = new Map<string, SessionStoredObject>();

function getForgeConfig() {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;
  if (!forgeUrl || !forgeKey) return null;
  return { forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey };
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

function storeInSession(relKey: string, data: Buffer | Uint8Array | string, contentType: string) {
  const key = `session/${appendHashSuffix(normalizeKey(relKey))}`;
  sessionStorage.set(key, { data: typeof data === "string" ? Buffer.from(data) : Buffer.from(data), contentType });
  return { key, url: `/manus-storage/${key}` };
}

/** Artefato disponível apenas enquanto o processo do servidor estiver ativo. */
export function getSessionStoredObject(key: string): SessionStoredObject | null {
  return sessionStorage.get(normalizeKey(key)) ?? null;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const forgeConfig = getForgeConfig();
  if (!forgeConfig) return storeInSession(relKey, data, contentType);
  const { forgeUrl, forgeKey } = forgeConfig;
  const key = appendHashSuffix(normalizeKey(relKey));

  const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
  presignUrl.searchParams.set("path", key);
  try {
    const presignResp = await fetch(presignUrl, { headers: { Authorization: `Bearer ${forgeKey}` } });
    if (!presignResp.ok) return storeInSession(relKey, data, contentType);
    const presignBody = await presignResp.text();
    const { url: s3Url } = JSON.parse(presignBody) as { url: string };
    if (!s3Url) return storeInSession(relKey, data, contentType);

    const blob = typeof data === "string" ? new Blob([data], { type: contentType }) : new Blob([data as any], { type: contentType });
    const uploadResp = await fetch(s3Url, { method: "PUT", headers: { "Content-Type": contentType }, body: blob });
    if (!uploadResp.ok) return storeInSession(relKey, data, contentType);
    return { key, url: `/manus-storage/${key}` };
  } catch {
    return storeInSession(relKey, data, contentType);
  }
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/manus-storage/${key}` };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const forgeConfig = getForgeConfig();
  if (!forgeConfig) return (await storageGet(relKey)).url;
  const { forgeUrl, forgeKey } = forgeConfig;
  const key = normalizeKey(relKey);
  const getUrl = new URL("v1/storage/presign/get", forgeUrl + "/");
  getUrl.searchParams.set("path", key);
  try {
    const resp = await fetch(getUrl, { headers: { Authorization: `Bearer ${forgeKey}` } });
    if (!resp.ok) return (await storageGet(relKey)).url;
    const body = await resp.text();
    const { url } = JSON.parse(body) as { url: string };
    if (!url) return (await storageGet(relKey)).url;
    return url;
  } catch {
    return (await storageGet(relKey)).url;
  }
}

import { afterEach, describe, expect, it } from "vitest";
import { vi } from "vitest";
import { ENV } from "./_core/env";
import { getSessionStoredObject, storagePut } from "./storage";

const originalForgeUrl = ENV.forgeApiUrl;
const originalForgeKey = ENV.forgeApiKey;

afterEach(() => {
  ENV.forgeApiUrl = originalForgeUrl;
  ENV.forgeApiKey = originalForgeKey;
  vi.restoreAllMocks();
});

describe("armazenamento de sessão fora do Manus", () => {
  it("mantém o artefato temporariamente quando não há credenciais Forge", async () => {
    ENV.forgeApiUrl = "";
    ENV.forgeApiKey = "";

    const stored = await storagePut("b3/raw/2026-08-13/BVBG.028.02/IN260813.zip", Buffer.from("arquivo-b3"), "application/zip");

    expect(stored.key).toMatch(/^session\/b3\/raw\/2026-08-13\/BVBG\.028\.02\/IN260813_/);
    expect(stored.url).toBe(`/manus-storage/${stored.key}`);
    expect(getSessionStoredObject(stored.key)).toMatchObject({ contentType: "application/zip", data: Buffer.from("arquivo-b3") });
  });

  it("recorre à sessão quando o Forge configurado não responde", async () => {
    ENV.forgeApiUrl = "https://forge-indisponivel.example";
    ENV.forgeApiKey = "token-de-teste";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("indisponível", { status: 503 }));

    const stored = await storagePut("b3/raw/2026-08-13/BVBG.028.02/IN260813.zip", Buffer.from("arquivo-b3"), "application/zip");

    expect(stored.key).toMatch(/^session\/b3\/raw\/2026-08-13\/BVBG\.028\.02\/IN260813_/);
    expect(getSessionStoredObject(stored.key)?.data).toEqual(Buffer.from("arquivo-b3"));
  });
});

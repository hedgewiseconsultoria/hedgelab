import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readB3ArchiveFromSnapshotCache } from "./b3SnapshotCache";

const ORIGINAL_ENV = { ...process.env };

function resetEnv() {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.B3_SNAPSHOT_CACHE_GITHUB_OWNER;
  delete process.env.B3_SNAPSHOT_CACHE_GITHUB_REPO;
  delete process.env.B3_SNAPSHOT_CACHE_GITHUB_BRANCH;
  delete process.env.B3_SNAPSHOT_CACHE_GITHUB_TOKEN;
}

describe("cache de snapshot diário da B3 (GitHub)", () => {
  beforeEach(resetEnv);
  afterEach(() => { resetEnv(); vi.unstubAllGlobals(); });

  it("retorna null sem chamar rede quando o cache não está configurado", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const result = await readB3ArchiveFromSnapshotCache({ reportType: "BVBG.086.01", asOf: "2026-08-14", archiveFilename: "PR260814.zip" });
    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("retorna o buffer do snapshot quando o hash publicado confere", async () => {
    process.env.B3_SNAPSHOT_CACHE_GITHUB_OWNER = "acme";
    process.env.B3_SNAPSHOT_CACHE_GITHUB_REPO = "hedge-lab-data";
    const zipBytes = Buffer.from("PK\x03\x04-fake-zip-bytes");
    const hash = createHash("sha256").update(zipBytes).digest("hex");
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).endsWith(".sha256?ref=main")) return new Response(hash, { status: 200 });
      return new Response(zipBytes, { status: 200 });
    }));
    const result = await readB3ArchiveFromSnapshotCache({ reportType: "BVBG.086.01", asOf: "2026-08-14", archiveFilename: "PR260814.zip" });
    expect(result).not.toBeNull();
    expect(result?.buffer.equals(zipBytes)).toBe(true);
    expect(result?.source).toBe("github_snapshot_cache");
  });

  it("retorna null quando o hash publicado diverge dos bytes recebidos (nunca serve um snapshot corrompido)", async () => {
    process.env.B3_SNAPSHOT_CACHE_GITHUB_OWNER = "acme";
    process.env.B3_SNAPSHOT_CACHE_GITHUB_REPO = "hedge-lab-data";
    const zipBytes = Buffer.from("PK\x03\x04-fake-zip-bytes");
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).endsWith(".sha256?ref=main")) return new Response("0000000000000000000000000000000000000000000000000000000000000000", { status: 200 });
      return new Response(zipBytes, { status: 200 });
    }));
    const result = await readB3ArchiveFromSnapshotCache({ reportType: "BVBG.086.01", asOf: "2026-08-14", archiveFilename: "PR260814.zip" });
    expect(result).toBeNull();
  });

  it("retorna null quando o snapshot não existe para a data (404), sem lançar exceção", async () => {
    process.env.B3_SNAPSHOT_CACHE_GITHUB_OWNER = "acme";
    process.env.B3_SNAPSHOT_CACHE_GITHUB_REPO = "hedge-lab-data";
    vi.stubGlobal("fetch", vi.fn(async () => new Response("not found", { status: 404 })));
    const result = await readB3ArchiveFromSnapshotCache({ reportType: "BVBG.086.01", asOf: "2026-08-14", archiveFilename: "PR260814.zip" });
    expect(result).toBeNull();
  });
});

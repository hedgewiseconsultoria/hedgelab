export type LocalSimulationVersion = {
  bundle_id: string;
  bundle_sha256: string;
  exported_at_utc: string;
  scenario_id: string;
  exposure_count: number;
  bundle: unknown;
};

export const LOCAL_SIMULATION_HISTORY_KEY = "hedge-lab.simulation-history.v1";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export function simulationHistoryKey(profileId: string): string {
  const normalized = profileId.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return `${LOCAL_SIMULATION_HISTORY_KEY}.${normalized || "perfil-local"}`;
}

export function loadSimulationHistory(storage: StorageLike | null | undefined, profileId = "perfil-local"): LocalSimulationVersion[] {
  if (!storage) return [];
  try {
    const candidate: unknown = JSON.parse(storage.getItem(simulationHistoryKey(profileId)) ?? "[]");
    return Array.isArray(candidate) ? candidate.slice(0, 20) as LocalSimulationVersion[] : [];
  } catch {
    return [];
  }
}

export function appendSimulationHistory(current: LocalSimulationVersion[], version: LocalSimulationVersion, storage: StorageLike | null | undefined, profileId = "perfil-local"): LocalSimulationVersion[] {
  const next = [version, ...current.filter(item => item.bundle_sha256 !== version.bundle_sha256)].slice(0, 20);
  storage?.setItem(simulationHistoryKey(profileId), JSON.stringify(next));
  return next;
}

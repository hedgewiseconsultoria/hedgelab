import { describe, expect, it } from "vitest";
import { DATABASE_MODE, getDb, getUserByOpenId, upsertUser } from "./db";

describe("adaptador de banco inativo", () => {
  it("não cria cliente nem persiste usuário quando o runtime de compatibilidade o chama", async () => {
    expect(DATABASE_MODE).toBe("disabled_without_fallback");
    expect(await getDb()).toBeNull();
    await expect(upsertUser({ openId: "runtime-compatibility" })).resolves.toBeUndefined();
    await expect(getUserByOpenId("runtime-compatibility")).resolves.toBeUndefined();
  });
});

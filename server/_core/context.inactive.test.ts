import { describe, expect, it } from "vitest";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { createContext } from "./context";

describe("contexto público sem OAuth", () => {
  it("não resolve nem carrega usuário para requisições do produto", async () => {
    const context = await createContext({
      req: { protocol: "https", headers: {} },
      res: {},
    } as CreateExpressContextOptions);
    expect(context.user).toBeNull();
  });
});

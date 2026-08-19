import { describe, expect, it } from "vitest";
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const ctx = {
  user: null,
  req: { protocol: "https", headers: {} },
  res: {},
} as TrpcContext;

describe("product.runtime", () => {
  it("declara que o produto não requer autenticação nem banco de dados", async () => {
    const result = await appRouter.createCaller(ctx).product.runtime();
    expect(result).toEqual({
      persistence: "dataframes_session_object_storage",
      authentication: "inactive_not_required",
      database: "disabled_without_fallback",
    });
  });
});

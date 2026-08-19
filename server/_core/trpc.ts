import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const inactiveAuthentication = (code: "UNAUTHORIZED" | "FORBIDDEN", message: string) =>
  t.middleware(() => {
    throw new TRPCError({ code, message });
  });

/** O produto não registra módulos protegidos nesta versão sem autenticação. */
export const protectedProcedure = t.procedure.use(inactiveAuthentication("UNAUTHORIZED", UNAUTHED_ERR_MSG));

/** O produto não registra módulos administrativos nesta versão sem autenticação. */
export const adminProcedure = t.procedure.use(inactiveAuthentication("FORBIDDEN", NOT_ADMIN_ERR_MSG));

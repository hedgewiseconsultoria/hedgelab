import type { InsertUser, User } from "../drizzle/schema";

/**
 * O HEDGE LAB não usa persistência relacional nesta versão.
 * O módulo permanece apenas como adaptador inerte para compatibilidade com o
 * runtime OAuth herdado, que não é um requisito do produto nem cria registros.
 */
export const DATABASE_MODE = "disabled_without_fallback" as const;

export async function getDb(): Promise<null> {
  return null;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for compatibility call");
  console.info("[HEDGE LAB] Persistência de usuário ignorada: banco de dados desativado.");
}

export async function getUserByOpenId(_openId: string): Promise<User | undefined> {
  return undefined;
}

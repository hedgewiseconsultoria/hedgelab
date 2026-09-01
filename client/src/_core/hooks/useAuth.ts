/**
 * Compatibilidade com componentes do template. O HEDGE LAB não exige login nem
 * cria sessões de usuário; dados de trabalho vivem em DataFrames locais e em
 * exportações explícitas.
 */
type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(_options?: UseAuthOptions) {
  return {
    user: null,
    loading: false,
    error: null,
    isAuthenticated: false,
    refresh: async () => undefined,
    logout: async () => undefined,
  };
}

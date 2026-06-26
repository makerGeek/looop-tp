// TODO: read AuthContext with React 19's `use()` and throw if it's null
// (i.e., hook used outside <AuthProvider>).

export function useAuth() {
  return {
    user: null as null | { id: string; name: string },
    login: (_name: string) => {},
    logout: () => {},
  };
}

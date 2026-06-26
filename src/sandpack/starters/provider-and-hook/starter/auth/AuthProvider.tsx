// TODO: wrap children in <AuthContext.Provider> with a memoized
// { user, login, logout } value driven by useState.

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

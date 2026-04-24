import { useMemo, useState, type ReactNode } from "react";
import { AuthContext, type User } from "./AuthContext";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const value = useMemo(
    () => ({
      user,
      login: (name: string) =>
        setUser({ id: crypto.randomUUID(), name }),
      logout: () => setUser(null),
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

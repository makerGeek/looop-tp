import { createContext } from "react";

export interface User {
  id: string;
  name: string;
}

export interface AuthValue {
  user: User | null;
  login: (name: string) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthValue | null>(null);

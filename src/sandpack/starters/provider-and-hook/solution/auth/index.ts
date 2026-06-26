// Public API of the auth module — only the provider and hook are exposed.
// AuthContext stays internal so consumers must go through the hook.
export { AuthProvider } from "./AuthProvider";
export { useAuth } from "./useAuth";
export type { User } from "./AuthContext";

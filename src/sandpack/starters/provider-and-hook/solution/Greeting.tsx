import { useAuth } from "./auth";

export function Greeting() {
  const { user } = useAuth();
  if (!user) return <p>👋 Sign in to continue.</p>;
  return <p>Welcome back, <b>{user.name}</b>.</p>;
}

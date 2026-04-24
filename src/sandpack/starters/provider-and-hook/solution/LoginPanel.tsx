import { useState } from "react";
import { useAuth } from "./auth";

export function LoginPanel() {
  const { user, login, logout } = useAuth();
  const [name, setName] = useState("");

  if (user) {
    return <button onClick={logout}>Sign out</button>;
  }

  return (
    <form
      style={{ display: "flex", gap: 8 }}
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) login(name.trim());
      }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
      />
      <button type="submit" disabled={!name.trim()}>
        Sign in
      </button>
    </form>
  );
}

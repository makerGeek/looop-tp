import type { User } from "./types";

interface UsersListProps {
  users: User[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

// Pure presentational component — no state, no effects, no fetching.
export function UsersList({ users, selectedId, onSelect }: UsersListProps) {
  if (users.length === 0) return <p>No users.</p>;
  return (
    <ul style={{ padding: 0, listStyle: "none", display: "grid", gap: 4 }}>
      {users.map((u) => {
        const active = u.id === selectedId;
        return (
          <li key={u.id}>
            <button
              type="button"
              onClick={() => onSelect(u.id)}
              style={{
                padding: "6px 10px",
                width: "100%",
                textAlign: "left",
                background: active ? "#2563eb" : "white",
                color: active ? "white" : "#0f172a",
                border: "1px solid #cbd5e1",
                borderRadius: 6,
              }}
            >
              <strong>{u.name}</strong>{" "}
              <small style={{ opacity: 0.7 }}>· {u.role}</small>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

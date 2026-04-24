import { useEffect, useState } from "react";
import type { User } from "./types";
import { UsersList } from "./UsersList";

async function fetchUsers(): Promise<User[]> {
  await new Promise((r) => setTimeout(r, 400));
  return [
    { id: "1", name: "Dana", role: "admin" },
    { id: "2", name: "Sam", role: "member" },
    { id: "3", name: "Riley", role: "member" },
  ];
}

// Container: owns data, state, effects, handlers — no JSX layout details.
export function UsersContainer() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchUsers().then((u) => {
      if (cancelled) return;
      setUsers(u);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <p>Loading users…</p>;

  const selected = users.find((u) => u.id === selectedId);

  return (
    <section style={{ display: "grid", gap: 12 }}>
      <UsersList
        users={users}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />
      {selected ? (
        <p style={{ fontSize: 14, color: "#475569" }}>
          Selected: <b>{selected.name}</b> ({selected.role})
        </p>
      ) : null}
    </section>
  );
}

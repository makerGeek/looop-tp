// app/users/page.tsx — Server Component (no "use client" directive).
// Fetches on the server, streams to the browser.

import { LikeButton } from "./LikeButton";

interface User {
  id: number;
  name: string;
  likes: number;
}

async function getUsers(): Promise<User[]> {
  // Direct DB/HTTP calls run on the server — no API route needed.
  const res = await fetch("https://api.example.com/users", {
    next: { revalidate: 60 },
  });
  return res.json();
}

export default async function UsersPage() {
  const users = await getUsers();
  return (
    <main>
      <h1>Users</h1>
      <ul>
        {users.map((u) => (
          <li key={u.id}>
            {u.name}
            {/* Interactive island — client component */}
            <LikeButton initial={u.likes} />
          </li>
        ))}
      </ul>
    </main>
  );
}

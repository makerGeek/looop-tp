import { Suspense } from "react";

async function fetchProfile() {
  await new Promise((r) => setTimeout(r, 1000));
  return { name: "Dana", role: "Learner" };
}

// TODO: create the promise once, and use() it inside a suspending component.

function Skeleton() {
  return <p>⏳ Loading profile…</p>;
}

export default function App() {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <Suspense fallback={<Skeleton />}>{/* TODO */}</Suspense>
    </div>
  );
}

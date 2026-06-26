import { Suspense, use, useState, useMemo } from "react";

interface Profile {
  name: string;
  role: string;
}

async function fetchProfile(seed: number): Promise<Profile> {
  await new Promise((r) => setTimeout(r, 1000));
  return { name: "Dana", role: `Learner v${seed}` };
}

function Profile({ promise }: { promise: Promise<Profile> }) {
  const data = use(promise);
  return (
    <article>
      <h2>{data.name}</h2>
      <p>{data.role}</p>
    </article>
  );
}

function Skeleton() {
  return <p>⏳ Loading profile…</p>;
}

export default function App() {
  const [seed, setSeed] = useState(1);
  const promise = useMemo(() => fetchProfile(seed), [seed]);
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <button onClick={() => setSeed((s) => s + 1)}>Refresh</button>
      <Suspense fallback={<Skeleton />}>
        <Profile promise={promise} />
      </Suspense>
    </div>
  );
}

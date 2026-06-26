import { useState } from "react";

// TODO: model a discriminated route union with typed search params.

type Route = { name: "home" } | { name: "search"; search?: unknown };

export default function App() {
  const [route, setRoute] = useState<Route>({ name: "home" });
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <nav style={{ display: "flex", gap: 8 }}>
        <button onClick={() => setRoute({ name: "home" })}>Home</button>
        <button onClick={() => setRoute({ name: "search" })}>Search</button>
      </nav>
      <pre>{JSON.stringify(route, null, 2)}</pre>
    </div>
  );
}

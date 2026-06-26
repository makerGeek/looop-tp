import { useState } from "react";

type Route =
  | { name: "home" }
  | { name: "search"; search: { q: string; page: number } }
  | { name: "detail"; params: { id: string } };

function validate(input: unknown): Route | null {
  if (!input || typeof input !== "object") return null;
  const r = input as { name: string; search?: any; params?: any };
  if (r.name === "home") return { name: "home" };
  if (r.name === "search") {
    const { q, page } = r.search ?? {};
    if (typeof q !== "string" || typeof page !== "number") return null;
    return { name: "search", search: { q, page } };
  }
  if (r.name === "detail") {
    const { id } = r.params ?? {};
    if (typeof id !== "string") return null;
    return { name: "detail", params: { id } };
  }
  return null;
}

export default function App() {
  const [route, setRoute] = useState<Route>({ name: "home" });
  const go = (next: Route) => {
    const ok = validate(next);
    if (ok) setRoute(ok);
  };
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <nav style={{ display: "flex", gap: 8 }}>
        <button onClick={() => go({ name: "home" })}>Home</button>
        <button
          onClick={() => go({ name: "search", search: { q: "react", page: 1 } })}
        >
          /search?q=react&page=1
        </button>
        <button onClick={() => go({ name: "detail", params: { id: "42" } })}>
          /detail/42
        </button>
      </nav>
      <Screen route={route} />
    </div>
  );
}

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case "home":
      return <p>🏠 Home</p>;
    case "search":
      return (
        <p>
          🔎 Searching <b>{route.search.q}</b> (page {route.search.page})
        </p>
      );
    case "detail":
      return <p>📄 Detail #{route.params.id}</p>;
  }
}

import { useState, type ReactNode } from "react";

type Status = "idle" | "loading" | "error" | "ready" | "notFound";

function RootLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontFamily: "system-ui" }}>
      <header
        style={{
          borderBottom: "1px solid #e2e8f0",
          padding: 12,
          fontWeight: 600,
        }}
      >
        Next.js App Router demo
      </header>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

function Loading() {
  return <p>⏳ Streaming from server…</p>;
}

function ErrorPanel({ reset }: { reset: () => void }) {
  return (
    <div>
      <p style={{ color: "crimson" }}>Something went wrong.</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}

function NotFound() {
  return <p>404 — segment not found.</p>;
}

export default function App() {
  const [status, setStatus] = useState<Status>("idle");
  return (
    <RootLayout>
      <nav style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={() => setStatus("loading")}>Load</button>
        <button onClick={() => setStatus("ready")}>Ready</button>
        <button onClick={() => setStatus("error")}>Error</button>
        <button onClick={() => setStatus("notFound")}>404</button>
      </nav>
      <main>
        {status === "loading" ? <Loading /> : null}
        {status === "ready" ? <p>✅ Ready.</p> : null}
        {status === "error" ? <ErrorPanel reset={() => setStatus("idle")} /> : null}
        {status === "notFound" ? <NotFound /> : null}
      </main>
    </RootLayout>
  );
}

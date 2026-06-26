import { useState } from "react";

type Fetch<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "success"; data: T };

export default function App() {
  const [state, setState] = useState<Fetch<{ name: string }>>({
    status: "idle",
  });

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={() => setState({ status: "idle" })}>idle</button>
        <button onClick={() => setState({ status: "loading" })}>loading</button>
        <button
          onClick={() =>
            setState({ status: "error", error: "Something went wrong" })
          }
        >
          error
        </button>
        <button
          onClick={() =>
            setState({ status: "success", data: { name: "Dana" } })
          }
        >
          success
        </button>
      </div>
      <Panel state={state} onRetry={() => setState({ status: "loading" })} />
    </div>
  );
}

function Panel({
  state,
  onRetry,
}: {
  state: Fetch<{ name: string }>;
  onRetry: () => void;
}) {
  switch (state.status) {
    case "idle":
      return <p>Pick a state to simulate.</p>;
    case "loading":
      return <p>⏳ Loading…</p>;
    case "error":
      return (
        <div>
          <p style={{ color: "crimson" }}>❌ {state.error}</p>
          <button onClick={onRetry}>Retry</button>
        </div>
      );
    case "success":
      return <p>✅ Hello, {state.data.name}!</p>;
  }
}

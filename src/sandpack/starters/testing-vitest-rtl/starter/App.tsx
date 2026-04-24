import { useState, useEffect } from "react";

function Counter() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <h1>{count}</h1>
      <button onClick={() => setCount((c) => c + 1)}>+</button>
    </div>
  );
}

// Simulated mini-RTL: mounts the component into a div and exposes queries.
function render(node: React.ReactNode) {
  const root = document.createElement("div");
  document.body.append(root);
  // In a real test: import { render } from '@testing-library/react'.
  return { root };
}

export default function App() {
  // TODO: add a "test" that clicks the button twice and shows the result.
  const [log, setLog] = useState<string[]>([]);
  useEffect(() => {
    setLog(["run the test in the solution view"]);
  }, []);
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <Counter />
      <pre>{log.join("\n")}</pre>
    </div>
  );
}

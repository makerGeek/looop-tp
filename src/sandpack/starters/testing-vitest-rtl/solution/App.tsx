import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

// Bare-minimum Testing-Library-like helpers, inlined so the sandbox is self-contained.
function render(node: React.ReactNode) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  root.render(node);
  return {
    getByRole: (role: string, { name }: { name: RegExp | string } = { name: /./ }) => {
      const all = Array.from(container.querySelectorAll<HTMLElement>("*"));
      const re = typeof name === "string" ? new RegExp(name, "i") : name;
      const found = all.find(
        (el) => el.getAttribute("role") === role || el.tagName.toLowerCase() === role
      );
      const match = all.find((el) => re.test(el.textContent || ""));
      return match ?? found!;
    },
    getByText: (text: RegExp | string) => {
      const re = typeof text === "string" ? new RegExp(text, "i") : text;
      return Array.from(container.querySelectorAll<HTMLElement>("*")).find(
        (el) => re.test(el.textContent || "")
      )!;
    },
    cleanup: () => root.unmount(),
  };
}

function Counter() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <h1>{count}</h1>
      <button type="button" onClick={() => setCount((c) => c + 1)}>
        +
      </button>
    </div>
  );
}

interface Result {
  name: string;
  pass: boolean;
  error?: string;
}

function runTests(): Result[] {
  const results: Result[] = [];
  const view = render(<Counter />);
  try {
    const btn = view.getByRole("button", { name: /\+/ });
    btn.click();
    btn.click();
    const heading = view.getByText(/^2$/);
    results.push({ name: "increments twice", pass: !!heading });
  } catch (e) {
    results.push({
      name: "increments twice",
      pass: false,
      error: String(e),
    });
  } finally {
    view.cleanup();
  }
  return results;
}

export default function App() {
  const [results, setResults] = useState<Result[]>([]);
  useEffect(() => {
    setResults(runTests());
  }, []);
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <h2>Test runner</h2>
      <ul>
        {results.map((r, i) => (
          <li key={i} style={{ color: r.pass ? "green" : "crimson" }}>
            {r.pass ? "✓" : "✗"} {r.name}
            {r.error ? ` — ${r.error}` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}

import { useEffect, useState } from "react";

// Tailwind v4 equivalent:
// @theme {
//   --color-bg: hsl(var(--bg));
//   --color-fg: hsl(var(--fg));
//   --color-primary: hsl(var(--primary));
// }
// :root { --bg: 0 0% 100%; --fg: 222 47% 11%; --primary: 221 83% 53%; }
// .dark { --bg: 222 47% 6%; --fg: 210 40% 98%; --primary: 217 91% 60%; }

const TOKEN_STYLES = `
  :root {
    --bg: #ffffff;
    --fg: #0f172a;
    --muted: #f1f5f9;
    --primary: #2563eb;
  }
  .dark {
    --bg: #0b1220;
    --fg: #e2e8f0;
    --muted: #1e293b;
    --primary: #60a5fa;
  }
  .card {
    background: var(--bg);
    color: var(--fg);
    border: 1px solid var(--muted);
    border-radius: 12px;
    padding: 16px;
  }
  .btn {
    background: var(--primary);
    color: white;
    padding: 6px 12px;
    border: 0;
    border-radius: 6px;
    cursor: pointer;
  }
`;

export default function App() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
  return (
    <>
      <style>{TOKEN_STYLES}</style>
      <div
        style={{
          background: "var(--bg)",
          color: "var(--fg)",
          minHeight: "100vh",
          padding: 24,
          fontFamily: "system-ui",
          transition: "background 150ms, color 150ms",
        }}
      >
        <button className="btn" onClick={() => setDark((d) => !d)}>
          {dark ? "☀️ Light" : "🌙 Dark"}
        </button>
        <div className="card" style={{ marginTop: 16, maxWidth: 360 }}>
          <h2 style={{ margin: 0 }}>Semantic tokens</h2>
          <p>
            This card uses <code>var(--bg)</code>, <code>var(--fg)</code>, and{" "}
            <code>--primary</code>. Toggle the theme — nothing else changes.
          </p>
        </div>
      </div>
    </>
  );
}

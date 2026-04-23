// TODO: extract Header, Sidebar, and Main into their own files under
// `./components/`, then import them here.

export default function App() {
  return (
    <div style={{ display: "grid", gridTemplateRows: "auto 1fr", height: "100vh", fontFamily: "system-ui" }}>
      <header style={{ padding: 12, background: "#0f172a", color: "white" }}>
        <strong>My App</strong>
      </header>
      <div style={{ display: "grid", gridTemplateColumns: "180px 1fr" }}>
        <aside style={{ padding: 12, background: "#f1f5f9" }}>
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            <li>Home</li>
            <li>Settings</li>
          </ul>
        </aside>
        <main style={{ padding: 16 }}>
          <h2>Welcome</h2>
          <p>Replace this monolithic App with composed components.</p>
        </main>
      </div>
    </div>
  );
}

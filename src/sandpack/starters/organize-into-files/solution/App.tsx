import { Header, Sidebar, Main } from "./components";

export default function App() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateRows: "auto 1fr",
        height: "100vh",
        fontFamily: "system-ui",
      }}
    >
      <Header title="My App" />
      <div style={{ display: "grid", gridTemplateColumns: "180px 1fr" }}>
        <Sidebar items={["Home", "Settings"]} />
        <Main />
      </div>
    </div>
  );
}

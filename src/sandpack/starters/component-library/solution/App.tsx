import { Button, Card, tokens } from "./lib/ui";

export default function App() {
  return (
    <div
      style={{
        background: tokens.color.muted,
        minHeight: "100vh",
        padding: tokens.space.xl,
      }}
    >
      <Card style={{ maxWidth: 360 }}>
        <h2 style={{ marginTop: 0 }}>Welcome</h2>
        <p>This page composes nothing but library primitives.</p>
        <div style={{ display: "flex", gap: tokens.space.sm }}>
          <Button onClick={() => alert("primary")}>Primary</Button>
          <Button variant="ghost" onClick={() => alert("ghost")}>
            Ghost
          </Button>
        </div>
      </Card>
    </div>
  );
}

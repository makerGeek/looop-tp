import type { ReactNode } from "react";

interface CardProps {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

function Card({ title, children, footer }: CardProps) {
  return (
    <article
      style={{
        border: "1px solid #ddd",
        borderRadius: 12,
        padding: 16,
        background: "white",
      }}
    >
      <h3 style={{ margin: 0 }}>{title}</h3>
      <div style={{ marginTop: 8 }}>{children}</div>
      {footer ? (
        <div style={{ marginTop: 12, paddingTop: 8, borderTop: "1px solid #eee" }}>
          {footer}
        </div>
      ) : null}
    </article>
  );
}

export default function App() {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui", display: "grid", gap: 16 }}>
      <Card title="Welcome">
        <p>Cards are great for composition.</p>
      </Card>
      <Card title="Footer slot" footer={<small>Updated today</small>}>
        <p>You can mix text, lists, and other components as children.</p>
      </Card>
    </div>
  );
}

import type { CSSProperties } from "react";

type Variant = "primary" | "secondary" | "ghost";

const base: CSSProperties = {
  fontSize: 14,
  padding: "6px 12px",
  borderRadius: 6,
  border: "1px solid transparent",
  cursor: "pointer",
  fontWeight: 500,
};

const variants: Record<Variant, CSSProperties> = {
  primary: { ...base, background: "#2563eb", color: "white" },
  secondary: {
    ...base,
    background: "#f1f5f9",
    color: "#0f172a",
    borderColor: "#cbd5e1",
  },
  ghost: { ...base, background: "transparent", color: "#2563eb" },
};

function Button({
  variant = "primary",
  children,
}: {
  variant?: Variant;
  children: React.ReactNode;
}) {
  return <button style={variants[variant]}>{children}</button>;
}

export default function App() {
  return (
    <div
      style={{
        padding: 24,
        display: "flex",
        gap: 8,
        fontFamily: "system-ui",
      }}
    >
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
    </div>
  );
}

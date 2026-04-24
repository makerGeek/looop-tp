// Note: Sandpack doesn't preload Tailwind — we simulate utilities with inline
// style variants. In a real project your `className` would use Tailwind classes
// like "rounded-md bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700".

import type { CSSProperties } from "react";

type Variant = "primary" | "secondary" | "ghost";

// TODO: fill in the styles for each variant.
const variants: Record<Variant, CSSProperties> = {
  primary: {},
  secondary: {},
  ghost: {},
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
    <div style={{ padding: 24, display: "flex", gap: 8 }}>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
    </div>
  );
}

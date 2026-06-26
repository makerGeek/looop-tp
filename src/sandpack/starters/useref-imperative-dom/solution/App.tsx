import { useRef, useState } from "react";

export default function App() {
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", display: "grid", gap: 12 }}>
      <input ref={inputRef} placeholder="Focus me" />
      <div
        ref={boxRef}
        style={{ width: 160, height: 64, background: "lightblue" }}
      />
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={() => inputRef.current?.focus()}>Focus input</button>
        <button
          onClick={() => {
            const rect = boxRef.current?.getBoundingClientRect();
            if (rect) setSize({ w: rect.width, h: rect.height });
          }}
        >
          Measure box
        </button>
        {size ? (
          <span>
            {size.w}×{size.h}
          </span>
        ) : null}
      </div>
    </div>
  );
}

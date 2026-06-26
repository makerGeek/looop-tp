import { useState } from "react";

const options = ["Alpha", "Beta", "Gamma", "Delta"];

// TODO: add keyboard nav + ARIA roles/state.
export default function App() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(options[0]);
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <button onClick={() => setOpen((o) => !o)}>{selected}</button>
      {open ? (
        <ul>
          {options.map((o) => (
            <li key={o} onClick={() => { setSelected(o); setOpen(false); }}>
              {o}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

import { useId, useRef, useState, type KeyboardEvent } from "react";

const options = ["Alpha", "Beta", "Gamma", "Delta"];

export default function App() {
  const listId = useId();
  const idFor = (o: string) => `${listId}-${o.toLowerCase()}`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [selected, setSelected] = useState(options[0]);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a - 1 + options.length) % options.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
      } else {
        setSelected(options[active]);
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <label htmlFor="combo">Choose a letter</label>
      <button
        id="combo"
        ref={triggerRef}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? idFor(options[active]) : undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        onBlur={() => setOpen(false)}
        style={{ display: "block", marginTop: 6 }}
      >
        {selected}
      </button>
      {open ? (
        <ul
          id={listId}
          role="listbox"
          style={{
            margin: 0,
            padding: 4,
            border: "1px solid #cbd5e1",
            borderRadius: 6,
            listStyle: "none",
            maxWidth: 160,
          }}
        >
          {options.map((o, i) => (
            <li
              key={o}
              id={idFor(o)}
              role="option"
              aria-selected={selected === o}
              onMouseDown={(e) => {
                e.preventDefault();
                setSelected(o);
                setOpen(false);
                triggerRef.current?.focus();
              }}
              onMouseEnter={() => setActive(i)}
              style={{
                padding: "4px 8px",
                background: i === active ? "#e2e8f0" : "transparent",
                cursor: "pointer",
              }}
            >
              {o}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

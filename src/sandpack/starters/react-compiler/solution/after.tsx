// After enabling the React Compiler: no manual memoization needed.
import { useState } from "react";

interface Item {
  id: string;
  label: string;
}

function Row({ item, onToggle }: { item: Item; onToggle: (id: string) => void }) {
  return (
    <li>
      <button onClick={() => onToggle(item.id)}>{item.label}</button>
    </li>
  );
}

export function List({ items }: { items: Item[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const toggle = (id: string) => {
    setSelected((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    );
  };
  const sorted = [...items].sort((a, b) => a.label.localeCompare(b.label));
  return (
    <ul>
      {sorted.map((i) => (
        <Row key={i.id} item={i} onToggle={toggle} />
      ))}
    </ul>
  );
}

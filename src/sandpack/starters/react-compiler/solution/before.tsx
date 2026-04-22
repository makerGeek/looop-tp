// Before the React Compiler: manual memoization everywhere.
import { memo, useCallback, useMemo, useState } from "react";

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
const MemoRow = memo(Row);

export function List({ items }: { items: Item[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const toggle = useCallback((id: string) => {
    setSelected((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    );
  }, []);
  const sorted = useMemo(
    () => [...items].sort((a, b) => a.label.localeCompare(b.label)),
    [items]
  );
  return (
    <ul>
      {sorted.map((i) => (
        <MemoRow key={i.id} item={i} onToggle={toggle} />
      ))}
    </ul>
  );
}

import { useReducer } from "react";
import {
  cartReducer,
  initialState,
  addItem,
  removeItem,
  clear,
  getTotal,
  getCount,
} from "./cart";

const SAMPLE = [
  { id: "1", label: "Pen", price: 1.99 },
  { id: "2", label: "Notebook", price: 4.5 },
  { id: "3", label: "Mug", price: 9.99 },
];

export function CartView() {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  return (
    <section style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {SAMPLE.map((s) => (
          <button
            key={s.id}
            onClick={() => dispatch(addItem({ ...s, id: crypto.randomUUID() }))}
          >
            + {s.label}
          </button>
        ))}
        <button onClick={() => dispatch(clear())}>Clear</button>
      </div>
      <ul style={{ paddingLeft: 16 }}>
        {state.items.map((i) => (
          <li key={i.id}>
            {i.label} — ${i.price}{" "}
            <button onClick={() => dispatch(removeItem(i.id))}>×</button>
          </li>
        ))}
      </ul>
      <p>
        <b>{getCount(state)} items · ${getTotal(state)}</b>
      </p>
    </section>
  );
}

import { useSyncExternalStore } from "react";

type Listener = () => void;
type Setter<T> = (partial: Partial<T> | ((s: T) => Partial<T>)) => void;
type Getter<T> = () => T;

function createStore<T>(init: (set: Setter<T>, get: Getter<T>) => T) {
  let state: T;
  const listeners = new Set<Listener>();
  const set: Setter<T> = (partial) => {
    const next =
      typeof partial === "function"
        ? (partial as (s: T) => Partial<T>)(state)
        : partial;
    state = { ...state, ...next };
    listeners.forEach((l) => l());
  };
  const get: Getter<T> = () => state;
  state = init(set, get);
  return {
    getState: get,
    subscribe: (l: Listener) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}

interface Item {
  id: string;
  label: string;
  price: number;
}
interface CartState {
  items: Item[];
  discount: number;
  add: (item: Item) => void;
  remove: (id: string) => void;
  clear: () => void;
  setDiscount: (d: number) => void;
  total: () => number;
}

const itemsSlice = (set: Setter<CartState>, get: Getter<CartState>) => ({
  items: [] as Item[],
  add: (item: Item) => set({ items: [...get().items, item] }),
  remove: (id: string) =>
    set({ items: get().items.filter((i) => i.id !== id) }),
  clear: () => set({ items: [] }),
});

const discountSlice = (set: Setter<CartState>) => ({
  discount: 0,
  setDiscount: (d: number) => set({ discount: Math.max(0, Math.min(1, d)) }),
});

const store = createStore<CartState>((set, get) => ({
  ...itemsSlice(set, get),
  ...discountSlice(set),
  total: () => {
    const s = get();
    const subtotal = s.items.reduce((n, i) => n + i.price, 0);
    return +(subtotal * (1 - s.discount)).toFixed(2);
  },
}));

function useCart<T>(selector: (s: CartState) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState())
  );
}

export default function App() {
  const items = useCart((s) => s.items);
  const discount = useCart((s) => s.discount);
  const total = useCart((s) => s.total());
  const add = useCart((s) => s.add);
  const remove = useCart((s) => s.remove);
  const setDiscount = useCart((s) => s.setDiscount);
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <button
        onClick={() =>
          add({
            id: crypto.randomUUID(),
            label: `Item ${items.length + 1}`,
            price: 9.99,
          })
        }
      >
        Add item
      </button>
      <label style={{ marginLeft: 12 }}>
        Discount{" "}
        <input
          type="number"
          min={0}
          max={1}
          step={0.05}
          value={discount}
          onChange={(e) => setDiscount(Number(e.target.value))}
          style={{ width: 60 }}
        />
      </label>
      <ul>
        {items.map((i) => (
          <li key={i.id}>
            {i.label} — ${i.price}{" "}
            <button onClick={() => remove(i.id)}>×</button>
          </li>
        ))}
      </ul>
      <p>
        <b>Total:</b> ${total}
      </p>
    </div>
  );
}

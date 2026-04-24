import { useSyncExternalStore } from "react";

// Minimal store shim to avoid installing zustand in the sandbox.
// In a real project use: `import { create } from 'zustand'`.

type Listener = () => void;
function createStore<T>(init: (set: (partial: Partial<T>) => void) => T) {
  let state: T;
  const listeners = new Set<Listener>();
  const set = (partial: Partial<T>) => {
    state = { ...state, ...partial };
    listeners.forEach((l) => l());
  };
  state = init(set);
  return {
    getState: () => state,
    subscribe: (l: Listener) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}

// TODO: define itemsSlice + discountSlice and merge them.

interface CartState {
  items: string[];
  add: (s: string) => void;
}

const store = createStore<CartState>((set) => ({
  items: [],
  add: (s) => set({ items: [...store.getState().items, s] }),
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
  const add = useCart((s) => s.add);
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <button onClick={() => add(`Item ${items.length + 1}`)}>Add item</button>
      <ul>
        {items.map((i, n) => (
          <li key={n}>{i}</li>
        ))}
      </ul>
    </div>
  );
}

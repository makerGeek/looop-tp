import { useReducer } from "react";

type State = { count: number; history: number[] };
type Action =
  | { type: "increment" }
  | { type: "decrement" }
  | { type: "set"; payload: number }
  | { type: "reset" }
  | { type: "undo" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "increment":
      return { count: state.count + 1, history: [...state.history, state.count] };
    case "decrement":
      return { count: state.count - 1, history: [...state.history, state.count] };
    case "set":
      return {
        count: action.payload,
        history: [...state.history, state.count],
      };
    case "reset":
      return { count: 0, history: [] };
    case "undo": {
      const prev = state.history[state.history.length - 1];
      if (prev === undefined) return state;
      return { count: prev, history: state.history.slice(0, -1) };
    }
    default: {
      const _exhaustive: never = action;
      return state;
    }
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, { count: 0, history: [] });
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 48 }}>{state.count}</h1>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => dispatch({ type: "decrement" })}>-</button>
        <button onClick={() => dispatch({ type: "increment" })}>+</button>
        <button onClick={() => dispatch({ type: "set", payload: 42 })}>
          set 42
        </button>
        <button onClick={() => dispatch({ type: "reset" })}>reset</button>
        <button
          onClick={() => dispatch({ type: "undo" })}
          disabled={state.history.length === 0}
        >
          undo
        </button>
      </div>
      <p style={{ color: "#64748b", fontSize: 12 }}>
        history: [{state.history.join(", ")}]
      </p>
    </div>
  );
}

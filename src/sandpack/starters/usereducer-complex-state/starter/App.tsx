import { useReducer } from "react";

// TODO: Action union + reducer function

type State = { count: number };
type Action = { type: string };

function reducer(state: State, _action: Action): State {
  return state;
}

export default function App() {
  const [state] = useReducer(reducer, { count: 0 });
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>{state.count}</h1>
      <div style={{ display: "flex", gap: 8 }}>
        <button>-</button>
        <button>+</button>
        <button>reset</button>
      </div>
    </div>
  );
}

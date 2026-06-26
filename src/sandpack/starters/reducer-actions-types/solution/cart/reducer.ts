import type { Action, CartState } from "./types";

export function cartReducer(state: CartState, action: Action): CartState {
  switch (action.type) {
    case "cart/addItem":
      return { items: [...state.items, action.payload] };
    case "cart/removeItem":
      return { items: state.items.filter((i) => i.id !== action.payload.id) };
    case "cart/clear":
      return { items: [] };
    default: {
      const _exhaustive: never = action;
      return state;
    }
  }
}

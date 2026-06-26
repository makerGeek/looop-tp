import type { CartState } from "./types";

export const getTotal = (state: CartState): number =>
  +state.items.reduce((sum, i) => sum + i.price, 0).toFixed(2);

export const getCount = (state: CartState): number => state.items.length;

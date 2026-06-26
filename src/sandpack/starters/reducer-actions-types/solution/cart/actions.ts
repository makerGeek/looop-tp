import type { Action, CartItem } from "./types";

export const addItem = (item: CartItem): Action => ({
  type: "cart/addItem",
  payload: item,
});

export const removeItem = (id: string): Action => ({
  type: "cart/removeItem",
  payload: { id },
});

export const clear = (): Action => ({ type: "cart/clear" });

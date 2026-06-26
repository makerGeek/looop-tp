export interface CartItem {
  id: string;
  label: string;
  price: number;
}

export interface CartState {
  items: CartItem[];
}

export type Action =
  | { type: "cart/addItem"; payload: CartItem }
  | { type: "cart/removeItem"; payload: { id: string } }
  | { type: "cart/clear" };

export const initialState: CartState = { items: [] };

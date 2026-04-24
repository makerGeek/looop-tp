import { CartView } from "./CartView";

export default function App() {
  return (
    <div
      style={{
        padding: 24,
        fontFamily: "system-ui",
        maxWidth: 480,
      }}
    >
      <h2>Cart</h2>
      <CartView />
    </div>
  );
}

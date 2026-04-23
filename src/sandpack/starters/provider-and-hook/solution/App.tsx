import { AuthProvider } from "./auth";
import { Greeting } from "./Greeting";
import { LoginPanel } from "./LoginPanel";

export default function App() {
  return (
    <AuthProvider>
      <div
        style={{
          padding: 24,
          fontFamily: "system-ui",
          display: "grid",
          gap: 12,
        }}
      >
        <Greeting />
        <LoginPanel />
      </div>
    </AuthProvider>
  );
}

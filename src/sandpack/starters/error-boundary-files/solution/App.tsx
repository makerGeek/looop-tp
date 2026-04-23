import { ErrorBoundary } from "./ErrorBoundary";
import { FallbackUI } from "./FallbackUI";
import { BuggyChild } from "./BuggyChild";

export default function App() {
  return (
    <div
      style={{
        padding: 24,
        fontFamily: "system-ui",
        display: "grid",
        gap: 12,
        maxWidth: 480,
      }}
    >
      <h2>Error boundary demo</h2>
      <ErrorBoundary
        fallback={({ error, reset }) => (
          <FallbackUI error={error} reset={reset} />
        )}
      >
        <BuggyChild />
      </ErrorBoundary>
    </div>
  );
}

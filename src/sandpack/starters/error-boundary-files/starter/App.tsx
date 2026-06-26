// TODO: build ErrorBoundary.tsx, FallbackUI.tsx, BuggyChild.tsx in separate
// files and compose them so the fallback shows when the child throws.

export default function App() {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <p>Wrap a buggy child in an error boundary with a custom fallback.</p>
    </div>
  );
}

interface FallbackUIProps {
  error: Error;
  reset: () => void;
}

export function FallbackUI({ error, reset }: FallbackUIProps) {
  return (
    <div
      role="alert"
      style={{
        border: "1px solid #fca5a5",
        background: "#fef2f2",
        padding: 16,
        borderRadius: 8,
        color: "#7f1d1d",
      }}
    >
      <strong>Something went wrong.</strong>
      <p style={{ fontSize: 13, margin: "8px 0" }}>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}

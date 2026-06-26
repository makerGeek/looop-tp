import { useState, type ReactNode } from "react";

function Card({ children }: { children: ReactNode }) {
  return (
    <article
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: 16,
        maxWidth: 360,
        background: "white",
      }}
    >
      {children}
    </article>
  );
}

function Dialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "grid",
        placeItems: "center",
      }}
      onClick={() => onOpenChange(false)}
    >
      <div
        style={{
          background: "white",
          padding: 20,
          borderRadius: 12,
          minWidth: 320,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: 0 }}>{title}</h3>
        <p style={{ fontSize: 14, color: "#475569" }}>{description}</p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={() => onOpenChange(false)}>Cancel</button>
          <button
            style={{ background: "#dc2626", color: "white" }}
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [open, setOpen] = useState(false);
  const [deleted, setDeleted] = useState(false);
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <Card>
        <h3>Danger zone</h3>
        <p style={{ fontSize: 14, color: "#475569" }}>
          {deleted ? "Account deleted." : "This cannot be undone."}
        </p>
        <button
          disabled={deleted}
          onClick={() => setOpen(true)}
          style={{ background: "#dc2626", color: "white" }}
        >
          Delete account
        </button>
      </Card>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Are you sure?"
        description="This action permanently deletes the account."
        onConfirm={() => setDeleted(true)}
      />
    </div>
  );
}

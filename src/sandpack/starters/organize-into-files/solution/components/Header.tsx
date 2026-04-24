interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  return (
    <header style={{ padding: 12, background: "#0f172a", color: "white" }}>
      <strong>{title}</strong>
    </header>
  );
}

interface SidebarProps {
  items: string[];
}

export function Sidebar({ items }: SidebarProps) {
  return (
    <aside style={{ padding: 12, background: "#f1f5f9" }}>
      <ul style={{ margin: 0, paddingLeft: 16 }}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </aside>
  );
}

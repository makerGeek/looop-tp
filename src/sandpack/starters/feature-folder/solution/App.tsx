import { TodoForm, TodoList } from "./features/todos";

export default function App() {
  return (
    <div
      style={{
        padding: 24,
        fontFamily: "system-ui",
        maxWidth: 480,
        display: "grid",
        gap: 12,
      }}
    >
      <h2>Todos</h2>
      <TodoForm />
      <TodoList />
    </div>
  );
}

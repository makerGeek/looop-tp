// TODO: split into UsersContainer (state + effects) and UsersList (pure render).
// Keep types in types.ts. App.tsx just renders <UsersContainer />.

export default function App() {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <p>Refactor into a container/presentational split.</p>
    </div>
  );
}

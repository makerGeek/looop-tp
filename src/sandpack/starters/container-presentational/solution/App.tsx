import { UsersContainer } from "./UsersContainer";

export default function App() {
  return (
    <div
      style={{
        padding: 24,
        fontFamily: "system-ui",
        maxWidth: 360,
      }}
    >
      <h2>Team</h2>
      <UsersContainer />
    </div>
  );
}

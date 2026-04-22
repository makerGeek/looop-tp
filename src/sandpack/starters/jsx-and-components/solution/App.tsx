interface GreetingProps {
  name: string;
  emoji?: string;
}

function Greeting({ name, emoji }: GreetingProps) {
  return (
    <section>
      <h2>
        {emoji ? `${emoji} ` : ""}Hello, {name}!
      </h2>
    </section>
  );
}

export default function App() {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Greeting demo</h1>
      <Greeting name="Dana" emoji="👋" />
      <Greeting name="Sam" />
    </div>
  );
}

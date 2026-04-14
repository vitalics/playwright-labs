import { Button } from "./components/Button";
import { Counter } from "./components/Counter";
import { UserCard } from "./components/UserCard";
import { ThemedButton, ThemeContext } from "./components/ThemedButton";

export default function App() {
  return (
    <div>
      <h1>React Selector Example</h1>

      <section aria-label="buttons">
        <Button label="Submit" variant="primary" disabled={false} />
        <Button label="Cancel" variant="secondary" disabled={false} />
        <Button label="Delete" variant="danger" disabled={true} />
      </section>

      <section aria-label="counters">
        <Counter step={1} />
        <Counter step={5} />
      </section>

      <section aria-label="users">
        <UserCard user={{ name: "Alice", role: "admin" }} />
        <UserCard user={{ name: "Bob", role: "user" }} />
      </section>

      <section aria-label="themed">
        <ThemeContext.Provider value={{ theme: "dark" }}>
          <ThemedButton label="Themed" />
        </ThemeContext.Provider>
      </section>
    </div>
  );
}

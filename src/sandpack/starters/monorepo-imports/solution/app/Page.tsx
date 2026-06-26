// "@app" — top-level pages, depend on @ui and @lib.
import { Money } from "@ui/Money";

export function Page() {
  return (
    <main>
      <h1>Invoice</h1>
      <p>
        Total: <Money amount={1234.56} />
      </p>
      <p>
        EUR: <Money amount={42} currency="EUR" />
      </p>
    </main>
  );
}

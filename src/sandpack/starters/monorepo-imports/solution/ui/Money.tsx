// "@ui" — presentational components, depend on @lib but not on @app.
import { formatMoney } from "@lib/format";

export interface MoneyProps {
  amount: number;
  currency?: string;
}

export function Money({ amount, currency }: MoneyProps) {
  return <strong>{formatMoney(amount, currency)}</strong>;
}

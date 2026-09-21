/** Formats integer cents for display. Cents everywhere avoids float drift. */
export function formatMoney(cents: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    }).format(cents / 100)
  }
  catch {
    return `$${(cents / 100).toFixed(2)}`
  }
}

/** Parses "19.99", "$19.99", "1,299" into integer cents. */
export function parseMoney(input: string | number): number {
  if (typeof input === 'number') return Math.round(input * 100)
  const cleaned = input.replace(/[^0-9.]/g, '')
  const value = Number.parseFloat(cleaned)
  return Number.isFinite(value) ? Math.round(value * 100) : 0
}

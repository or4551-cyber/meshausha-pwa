export function normalizeCatalogName(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/[׳']/g, '')
    .replace(/,/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

export function calculateUnitPrice(price: number, quantity: number | null): number | null {
  if (quantity === null) return null
  return Math.round((price / quantity) * 10000) / 10000
}

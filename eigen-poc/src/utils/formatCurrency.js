export function formatCurrency(amount) {
  if (amount == null) return '€0'
  return '€' + Math.round(amount).toLocaleString('nl-NL')
}

export function formatCurrencyShort(amount) {
  if (amount >= 1000000) return `€${(amount / 1000000).toFixed(1)}M`
  if (amount >= 1000) return `€${Math.round(amount / 1000)}.000`
  return formatCurrency(amount)
}

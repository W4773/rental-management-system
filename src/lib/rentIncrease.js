// Annual rent increase helpers. The increase itself is informational: nothing changes the rent automatically.

/**
 * Next date an annual increase takes effect and the rent it would produce.
 * First increase = property.increase_start_date; afterwards every year on the same day.
 * Returns null when no increase is configured.
 */
export function nextIncrease(property, today = new Date()) {
    const value = parseFloat(property?.annual_increase_pct)
    if (!value || value <= 0) return null

    const rent = parseFloat(property.monthly_rent || 0)
    const newRent = property.increase_type === 'fixed' ? rent + value : rent * (1 + value / 100)
    const label = property.increase_type === 'fixed' ? `RD$${value.toLocaleString('es-DO')}` : `${value}%`

    const first = property.increase_start_date
    if (!first) return { date: null, newRent, label }

    const [y, m, d] = first.slice(0, 10).split('-').map(Number)
    const base = new Date(y, m - 1, d)
    const day0 = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    let date = base
    while (date < day0) date = new Date(date.getFullYear() + 1, date.getMonth(), date.getDate())
    return { date, newRent, label }
}

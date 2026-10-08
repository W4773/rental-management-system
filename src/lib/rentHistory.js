const num = (v) => parseFloat(v) || 0

/**
 * Rent that applies to a month ('YYYY-MM') of a property: the latest change whose `from` is on or before
 * that month, or the current `monthly_rent` when the property has no history. Months that already have
 * payments keep the `rent_amount` stored in their rows; this is only for months without money.
 */
export function rentForMonth(property, key) {
    const history = Array.isArray(property?.rent_history) ? property.rent_history : []
    let rent = null
    let from = ''
    for (const entry of history) {
        if (entry && typeof entry.from === 'string' && entry.from <= key && entry.from >= from) {
            rent = entry.rent
            from = entry.from
        }
    }
    return rent !== null ? num(rent) : num(property?.monthly_rent)
}

/** New history after a price change that applies from `fromKey` ('YYYY-MM'); seeds it with the old price. */
export function withRentChange(property, newRent, fromKey) {
    const history = (Array.isArray(property?.rent_history) ? property.rent_history : [])
        .filter(e => e && typeof e.from === 'string' && e.from !== fromKey)
        .map(e => ({ from: e.from, rent: num(e.rent) }))
    if (history.length === 0) history.push({ from: '0000-01', rent: num(property?.monthly_rent) })
    history.push({ from: fromKey, rent: num(newRent) })
    return history.sort((a, b) => a.from.localeCompare(b.from))
}

/** Next month as 'YYYY-MM'. */
export function nextMonthKey(today = new Date()) {
    const d = new Date(today.getFullYear(), today.getMonth() + 1, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

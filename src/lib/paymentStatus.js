// Single source of truth for "how is this property/tenant doing on rent".
// Mirrors the logic the app already used in PropertiesList / PropertyCarousel / TenantSection.

/** 'YYYY-MM' of a rent_payments row (payment_month may come with a time part). */
export const monthKeyOf = (payment) => payment?.payment_month?.split('T')[0].slice(0, 7) || ''

/** Rows that actually carry money. */
export const hasMoney = (payment) => parseFloat(payment?.amount_paid || 0) > 0

const STATUS = {
    vacant: { key: 'vacant', label: 'VACANTE', badgeClass: null },
    paid: { key: 'paid', label: 'AL DÍA', badgeClass: 'wp-badge-green' },
    pending: { key: 'pending', label: 'PENDIENTE', badgeClass: 'wp-badge-amber' },
    late: { key: 'late', label: 'ATRASADO', badgeClass: 'wp-badge-red' }
}

const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const keyOf = (y, m) => `${y}-${String(m + 1).padStart(2, '0')}`

/** 'YYYY-MM' -> 'jul 2026' (or just 'jul' when `withYear` is false). */
export function formatMonthKey(key, withYear = true) {
    const [y, m] = key.split('-').map(Number)
    return withYear ? `${MONTHS_SHORT[m - 1]} ${y}` : MONTHS_SHORT[m - 1]
}

/** 'jul – sep 2026' / 'dic 2025 – feb 2026' for a sorted list of keys. */
function formatRange(keys) {
    const first = keys[0]
    const last = keys[keys.length - 1]
    if (first === last) return formatMonthKey(first)
    const sameYear = first.slice(0, 4) === last.slice(0, 4)
    return `${formatMonthKey(first, !sameYear)} – ${formatMonthKey(last)}`
}

const isContiguous = (keys) => keys.every((k, i) => {
    if (i === 0) return true
    const [py, pm] = keys[i - 1].split('-').map(Number)
    return keyOf(pm === 12 ? py + 1 : py, pm === 12 ? 0 : pm) === k
})

/**
 * Month-by-month standing of a tenant's rent, from the tenant's first month up to today.
 *  - overdue months  = past months (before the current one) not fully paid, INCLUDING months with no row at all
 *  - pending         = only the current month is still unpaid
 *  - paid            = nothing owed
 * Returns { key, label, badgeClass, detail, overdueMonths, monthsOwed, owedAmount, paidThrough }.
 */
export function getPaymentStatus(property, tenant, payments, today = new Date()) {
    if (!property || !tenant) return { ...STATUS.vacant, detail: 'Sin inquilino', overdueMonths: [], monthsOwed: 0, owedAmount: 0, paidThrough: null }

    const mine = payments.filter(p => p.property_id === property.id)
    const cy = today.getFullYear()
    const cm = today.getMonth()
    const rent = parseFloat(property.monthly_rent || 0)

    let [y, m] = (tenant.start_date || '').slice(0, 7).split('-').map(Number)
    if (!y || !m) { y = cy; m = cm + 1 }
    m -= 1

    // Look a bit past today so advance payments count towards "paid through"
    const lastRowKey = mine.filter(hasMoney).map(monthKeyOf).sort().pop() || keyOf(cy, cm)
    const endKey = lastRowKey > keyOf(cy, cm) ? lastRowKey : keyOf(cy, cm)

    const overdue = []
    let owedAmount = 0
    let currentUnpaid = false
    let paidThrough = null

    while (keyOf(y, m) <= endKey) {
        const st = getMonthStatus(mine, property, y, m, today)
        const isCurrent = y === cy && m === cm
        const isFutureMonth = y > cy || (y === cy && m > cm)
        if (st.status === 'paid') {
            paidThrough = st.key
        } else if (!isFutureMonth) {
            const owed = Math.max(0, parseFloat(mine.find(p => monthKeyOf(p) === st.key && hasMoney(p))?.rent_amount || rent) - st.total)
            if (isCurrent) currentUnpaid = true
            else { overdue.push(st.key); owedAmount += owed }
        }
        m += 1
        if (m > 11) { m = 0; y += 1 }
    }

    const base = { overdueMonths: overdue, monthsOwed: overdue.length, owedAmount, paidThrough }

    if (overdue.length > 0) {
        const n = overdue.length
        const detail = n === 1
            ? `Debe ${formatMonthKey(overdue[0])}`
            : isContiguous(overdue)
                ? `Debe ${formatRange(overdue)} (${n} meses)`
                : `Debe ${n} meses: ${formatMonthKey(overdue[0])} … ${formatMonthKey(overdue[n - 1])}`
        return { ...STATUS.late, ...base, detail }
    }
    if (currentUnpaid) {
        return { ...STATUS.pending, ...base, detail: `Pendiente ${formatMonthKey(keyOf(cy, cm))}` }
    }
    return { ...STATUS.paid, ...base, detail: paidThrough ? `Pagado hasta ${formatMonthKey(paidThrough)}` : 'Sin meses vencidos' }
}

export const STATUS_FILTERS = [
    { key: 'all', label: 'Todos' },
    { key: 'paid', label: 'Al día' },
    { key: 'pending', label: 'Pendientes' },
    { key: 'late', label: 'Atrasados' },
    { key: 'vacant', label: 'Vacantes' }
]

export const normalizeText = (s = '') =>
    s.toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/**
 * Status of one month of a property's rent: 'paid' | 'partial' | 'pending' | 'future'.
 * `payments` = rent_payments of that property (any extra rows are ignored by property filter upstream).
 */
export function getMonthStatus(payments, property, year, monthIndex, today = new Date()) {
    const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}`
    const rows = payments.filter(p => hasMoney(p) && monthKeyOf(p) === key)
    const total = rows.reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0)
    const rent = parseFloat(rows[0]?.rent_amount || property.monthly_rent)
    if (total > 0) {
        const isPaid = rows.some(p => p.payment_type === 'full') || total >= rent - 1
        return { key, status: isPaid ? 'paid' : 'partial', total }
    }
    const isFuture = year > today.getFullYear() || (year === today.getFullYear() && monthIndex > today.getMonth())
    return { key, status: isFuture ? 'future' : 'pending', total: 0 }
}

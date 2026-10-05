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

/**
 * @param {string} propertyId
 * @param {boolean} hasTenant whether the property has an active tenant
 * @param {Array} payments all rent_payments
 */
export function getPaymentStatus(propertyId, hasTenant, payments, today = new Date()) {
    if (!hasTenant) return STATUS.vacant

    const day = new Date(today); day.setHours(0, 0, 0, 0)
    const currentMonth = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}`

    const mine = payments.filter(p => p.property_id === propertyId)
    if (mine.some(p => monthKeyOf(p) === currentMonth && p.payment_status === 'paid')) return STATUS.paid

    const unpaid = mine
        .filter(p => p.payment_status !== 'paid')
        .sort((a, b) => monthKeyOf(a).localeCompare(monthKeyOf(b)))
    if (unpaid.length === 0) return STATUS.paid

    const firstOfOldest = new Date(monthKeyOf(unpaid[0]) + '-01T00:00:00')
    const daysSince = Math.floor((day - firstOfOldest) / 86400000)
    return daysSince > 30 ? STATUS.late : STATUS.pending
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

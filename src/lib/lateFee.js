import { getPendingBills } from './paymentStatus'

// Late fee ("mora") rules, configured in Ajustes -> Cargos and stored in user_settings.late_fee_settings.
// A month's rent is late once `today` is AFTER the cut-off day: "día 15 del mes siguiente" means the fee
// starts on the 16th of the following month. The fee is charged once per late month (never compounds).

export const DEFAULT_LATE_FEE = {
    enabled: false,
    type: 'fixed',        // 'fixed' (RD$ per late month) | 'percent' (% of what is still owed for that month)
    value: 0,
    graceDay: 15,         // cut-off day of the month
    graceMonth: 'next'    // 'same' = month the rent belongs to, 'next' = the following month
}

/** Saved settings merged over the defaults (older/partial values never break anything). */
export const resolveLateFeeSettings = (saved) => ({ ...DEFAULT_LATE_FEE, ...(saved || {}) })

const isActive = (cfg) => !!cfg && cfg.enabled && (parseFloat(cfg.value) || 0) > 0

/** Last day WITHOUT a fee for the rent of `monthKey` ('YYYY-MM'). Local date at 00:00. */
export function lateFeeCutoff(monthKey, cfg) {
    const [y, m] = monthKey.split('-').map(Number)
    const offset = cfg.graceMonth === 'same' ? 0 : 1
    const day = Math.min(Math.max(parseInt(cfg.graceDay, 10) || 1, 1), 31)
    // day 31 in a 30-day month would roll over: clamp to the last real day
    const lastDay = new Date(y, m - 1 + offset + 1, 0).getDate()
    return new Date(y, m - 1 + offset, Math.min(day, lastDay))
}

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

export function isMonthLate(monthKey, cfg, today = new Date()) {
    return isActive(cfg) && startOfDay(today) > lateFeeCutoff(monthKey, cfg)
}

/** Does this tenant currently have a month past its cut-off? (for the "Mora" tag; status comes from getPaymentStatus) */
export function hasLateFee(status, cfg, today = new Date()) {
    return isActive(cfg) && (status?.unpaidMonths || []).some(k => isMonthLate(k, cfg, today))
}

/**
 * Fee for the given months. `bills` = [{ key, remaining }]; only late months are charged.
 * Returns { total, items: [{ key, amount }] }.
 */
export function computeLateFee(bills, cfg, today = new Date()) {
    if (!isActive(cfg)) return { total: 0, items: [] }
    const value = parseFloat(cfg.value) || 0
    const items = bills
        .filter(b => isMonthLate(b.key, cfg, today))
        .map(b => ({ key: b.key, amount: round2(cfg.type === 'percent' ? (b.remaining * value) / 100 : value) }))
    return { total: round2(items.reduce((s, i) => s + i.amount, 0)), items }
}

/** Fee for the months listed in a collection letter (the tenant's overdue months). */
export function lateFeeForLetter({ property, tenant, payments, status, cfg, today = new Date() }) {
    const keys = status?.overdueMonths || []
    if (!isActive(cfg) || keys.length === 0) return { total: 0, items: [] }
    const bills = getPendingBills(property, tenant, payments, keys[keys.length - 1], today).filter(b => keys.includes(b.key))
    return computeLateFee(bills, cfg, today)
}

const round2 = (n) => Math.round(n * 100) / 100

/** Months a collection letter lists, with what is still owed on each: [{ key, remaining }]. Basis for a manual fee. */
export function billsForLetter({ property, tenant, payments, status, today = new Date() }) {
    const keys = status?.overdueMonths || []
    if (keys.length === 0) return []
    return getPendingBills(property, tenant, payments, keys[keys.length - 1], today).filter(b => keys.includes(b.key))
}

/**
 * Manual fee chosen by the user, independent of the Ajustes rule.
 * `entries` = { [monthKey]: { type: 'fixed' | 'percent', value } }; months without an entry (or with 0) are not charged.
 * Returns the same shape as computeLateFee: { total, items: [{ key, amount }] }.
 */
export function computeManualFee(bills, entries) {
    const items = []
    for (const b of bills) {
        const e = entries?.[b.key]
        const value = parseFloat(e?.value) || 0
        if (!e || value <= 0) continue
        const amount = round2(e.type === 'percent' ? (b.remaining * Math.min(value, 100)) / 100 : value)
        if (amount > 0) items.push({ key: b.key, amount })
    }
    return { total: round2(items.reduce((s, i) => s + i.amount, 0)), items }
}

/** Human sentence of the rule, e.g. "RD$ 500 por cada mes atrasado, a partir del día 16 del mes siguiente". */
export function describeLateFee(cfg) {
    const c = resolveLateFeeSettings(cfg)
    const amount = c.type === 'percent' ? `${c.value}% del saldo del mes` : `RD$ ${Number(c.value || 0).toLocaleString('es-DO')}`
    const day = (parseInt(c.graceDay, 10) || 1) + 1
    return `${amount} por cada mes atrasado, a partir del día ${day} ${c.graceMonth === 'same' ? 'del mismo mes' : 'del mes siguiente'}`
}

/**
 * Status used for a collection letter. The month in progress is not "overdue" yet, but once it is past its
 * fee cut-off (cut-off in the same month) it is owed with a fee, so the letter must list it too.
 */
export function statusForLetter({ property, tenant, payments, status, cfg, today = new Date() }) {
    const current = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
    if (!isActive(cfg) || (status.overdueMonths || []).includes(current) || !(status.unpaidMonths || []).includes(current) || !isMonthLate(current, cfg, today)) return status
    const bill = getPendingBills(property, tenant, payments, current, today).find(b => b.key === current)
    if (!bill) return status
    return {
        ...status,
        overdueMonths: [...status.overdueMonths, current],
        monthsOwed: status.monthsOwed + 1,
        owedAmount: status.owedAmount + bill.remaining
    }
}

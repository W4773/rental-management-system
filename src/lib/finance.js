import { getPaymentStatus, getMonthStatus, hasMoney, monthKeyOf } from './paymentStatus'

const keyOf = (y, m) => `${y}-${String(m + 1).padStart(2, '0')}`
const num = (v) => parseFloat(v) || 0

export const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

/** Years that have payments, plus the current one (newest first). */
export function financeYears(payments, today = new Date()) {
    const years = new Set([today.getFullYear()])
    payments.forEach(p => { const y = parseInt(monthKeyOf(p).slice(0, 4), 10); if (y) years.add(y) })
    return [...years].sort((a, b) => b - a)
}

/**
 * Everything the Finanzas page needs for one year.
 *  - collected: money received for rent months of that year (`includeAuto` adds the paid history generated at registration)
 *  - expected: rent due from the start of the year until today for every tenant living there, minus void months
 *  - owed: what is overdue today (months before the current one), from getPaymentStatus; independent of the year
 */
export function computeFinance({ properties, tenants, payments, buildings, year, includeAuto = true, today = new Date() }) {
    const cy = today.getFullYear()
    const cm = today.getMonth()
    const lastMonth = year < cy ? 11 : year === cy ? cm : -1 // last month already due in that year

    const counted = payments.filter(p => hasMoney(p) && (includeAuto || !p.auto_generated))
    const propById = new Map(properties.map(p => [p.id, p]))
    const monthly = Array.from({ length: 12 }, (_, i) => ({ month: i, label: MONTH_NAMES[i], collected: 0, expected: 0 }))

    const byBuilding = new Map()
    const bucket = (property) => {
        const id = buildings.some(b => b.id === property?.building_id) ? property.building_id : 'none'
        if (!byBuilding.has(id)) byBuilding.set(id, { id, building: buildings.find(b => b.id === id) || null, units: 0, occupied: 0, collected: 0, expected: 0, owed: 0, pendingCount: 0, lateCount: 0 })
        return byBuilding.get(id)
    }
    properties.forEach(p => { bucket(p).units += 1 })

    const byTenant = new Map()
    const tenantRow = (t) => {
        if (!byTenant.has(t.id)) {
            const property = propById.get(t.property_id)
            byTenant.set(t.id, { tenant: t, property, building: buildings.find(b => b.id === property?.building_id) || null, collected: 0, expected: 0, monthsOwed: 0, owed: 0, status: null, active: !t.end_date })
        }
        return byTenant.get(t.id)
    }
    tenants.forEach(tenantRow)

    // Collected
    for (const p of counted) {
        const k = monthKeyOf(p)
        if (!k.startsWith(`${year}-`)) continue
        const amount = num(p.amount_paid)
        monthly[parseInt(k.slice(5, 7), 10) - 1].collected += amount
        const property = propById.get(p.property_id)
        if (property) bucket(property).collected += amount
        const t = tenants.find(x => x.id === p.tenant_id)
        if (t) tenantRow(t).collected += amount
    }

    // Expected (rent due while the tenant lived there; void months and months implicitly settled are excluded)
    const rowsByProperty = new Map()
    const propertyRows = (id) => {
        if (!rowsByProperty.has(id)) rowsByProperty.set(id, payments.filter(p => p.property_id === id))
        return rowsByProperty.get(id)
    }
    for (const t of tenants) {
        const property = propById.get(t.property_id)
        if (!property) continue
        const startKey = (t.start_date || '').slice(0, 7)
        const endKey = (t.end_date || '').slice(0, 7)
        for (let m = 0; m <= lastMonth; m++) {
            const k = keyOf(year, m)
            if ((startKey && k < startKey) || (endKey && k > endKey)) continue
            const rows = payments.filter(p => p.tenant_id === t.id && monthKeyOf(p) === k)
            if (rows.some(p => p.voided)) continue
            if (getMonthStatus(propertyRows(property.id), property, year, m, today).implicit) continue
            const rent = num(rows.find(hasMoney)?.rent_amount) || num(property.monthly_rent)
            monthly[m].expected += rent
            bucket(property).expected += rent
            tenantRow(t).expected += rent
        }
    }

    // Owed today + status mix (active tenants)
    const statusMix = { paid: 0, pending: 0, late: 0, vacant: 0 }
    for (const property of properties) {
        const tenant = tenants.find(t => t.property_id === property.id && !t.end_date) || null
        const status = getPaymentStatus(property, tenant, payments, today)
        statusMix[status.key] += 1
        const b = bucket(property)
        if (tenant) {
            b.occupied += 1
            b.owed += status.owedAmount
            if (status.key === 'pending') b.pendingCount += 1
            if (status.key === 'late') b.lateCount += 1
            const row = tenantRow(tenant)
            row.status = status
            row.monthsOwed = status.monthsOwed
            row.owed = status.owedAmount
        }
    }

    const buildingRows = [...byBuilding.values()]
        .filter(b => b.units > 0)
        .map(b => ({ ...b, rate: b.expected > 0 ? Math.min(100, Math.round((b.collected / b.expected) * 100)) : null }))
        .sort((a, b) => (a.building?.name || '~').localeCompare(b.building?.name || '~', 'es', { numeric: true }))

    const tenantRows = [...byTenant.values()]
        .filter(r => r.active || r.collected > 0 || r.expected > 0)
        .map(r => ({ ...r, rate: r.expected > 0 ? Math.min(100, Math.round((r.collected / r.expected) * 100)) : null }))

    const collected = monthly.reduce((s, m) => s + m.collected, 0)
    const expected = monthly.reduce((s, m) => s + m.expected, 0)
    const owed = buildingRows.reduce((s, b) => s + b.owed, 0)
    const potentialRent = properties.reduce((s, p) => s + num(p.monthly_rent), 0)
    const occupiedRent = properties.filter(p => tenants.some(t => t.property_id === p.id && !t.end_date)).reduce((s, p) => s + num(p.monthly_rent), 0)

    // Collected per year (all history)
    const perYear = {}
    counted.forEach(p => { const y = monthKeyOf(p).slice(0, 4); if (y) perYear[y] = (perYear[y] || 0) + num(p.amount_paid) })
    const yearly = Object.keys(perYear).sort().map(y => ({ year: y, collected: perYear[y] }))

    return {
        year, monthly, buildingRows, tenantRows, statusMix, yearly,
        totals: {
            collected, expected, owed,
            rate: expected > 0 ? Math.min(100, Math.round((collected / expected) * 100)) : null,
            potentialRent, occupiedRent,
            vacantLoss: potentialRent - occupiedRent,
            pendingCount: statusMix.pending, lateCount: statusMix.late,
            avgMonthly: lastMonth >= 0 ? collected / (lastMonth + 1) : 0
        }
    }
}

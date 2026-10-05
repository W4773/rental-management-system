import { monthKey } from './calculations'

const rentPaidForMonth = (payments, propertyId, key) =>
    payments
        .filter(p => p.property_id === propertyId && monthKey(p.payment_month) === key)
        .reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0)

/** KPIs + overdue alerts computed from already-loaded data (no extra queries). */
export function computeMetrics({ properties, tenants, payments, gasReadings }, year = new Date().getFullYear()) {
    const today = new Date()
    const activeTenants = tenants.filter(t => t.end_date === null)

    const collected = payments
        .filter(p => p.payment_month?.startsWith(String(year)))
        .reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0)

    let overdueAmount = 0
    const alerts = []
    const currentKey = monthKey(today)

    activeTenants.forEach(tenant => {
        const property = properties.find(p => p.id === tenant.property_id)
        if (!property) return
        const rent = parseFloat(property.monthly_rent || 0)
        let [y, m] = tenant.start_date.slice(0, 7).split('-').map(Number)
        while (`${y}-${String(m).padStart(2, '0')}` < currentKey) {
            const key = `${y}-${String(m).padStart(2, '0')}`
            const paid = rentPaidForMonth(payments, property.id, key)
            if (paid < rent - 1) {
                const missing = rent - paid
                overdueAmount += missing
                const label = new Date(y, m - 1, 1).toLocaleDateString('es-DO', { month: 'long', year: 'numeric' })
                alerts.push({
                    id: `overdue-${property.id}-${key}`,
                    type: 'error',
                    title: `Pago atrasado - ${property.name}`,
                    subtitle: `${tenant.name} - ${label} - RD$${missing.toLocaleString('en-US')}`,
                    propertyId: property.id
                })
            }
            m += 1
            if (m > 12) { m = 1; y += 1 }
        }
    })

    gasReadings.filter(g => !g.paid).forEach(g => {
        const d = new Date(g.reading_date)
        if (monthKey(d) < currentKey) {
            const property = properties.find(p => p.id === g.property_id)
            alerts.push({
                id: `gas-${g.id}`,
                type: 'warning',
                title: `Gas pendiente - ${property?.name || 'Propiedad'}`,
                subtitle: `RD$${parseFloat(g.total_cost || 0).toLocaleString('en-US')}`,
                propertyId: g.property_id
            })
        }
    })

    const monthsElapsed = year === today.getFullYear() ? today.getMonth() + 1 : 12
    const expected = activeTenants.reduce((sum, t) => {
        const property = properties.find(p => p.id === t.property_id)
        return sum + (property ? parseFloat(property.monthly_rent || 0) * monthsElapsed : 0)
    }, 0)

    return {
        collected,
        overdueAmount,
        alerts,
        occupancy: properties.length ? Math.round((activeTenants.length / properties.length) * 100) : 0,
        collectionRate: expected > 0 ? Math.min(100, Math.round((collected / expected) * 100)) : 0
    }
}

export const normalizeText = (s = '') =>
    s.toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

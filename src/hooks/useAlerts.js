// src/hooks/useAlerts.js
import { useMemo } from 'react'
import { getPaymentStatus, monthKeyOf } from '../lib/paymentStatus'

/**
 * Payment alerts computed from already-fetched data.
 *  - overdue : every past month a tenant has not fully paid, including months with no payment row
 *  - upcoming: unpaid rows due within the next 7 days
 * @param {Array} payments - from usePayments()
 * @param {Array} tenants  - from useTenants()
 * @param {Array} properties - from useProperties()
 */
export function useAlerts(payments = [], tenants = [], properties = []) {
    return useMemo(() => {
        const today = new Date(); today.setHours(0, 0, 0, 0)
        const sevenDaysFromNow = new Date(today); sevenDaysFromNow.setDate(today.getDate() + 7)
        const monthStart = (key) => new Date(`${key}-01T00:00:00`)

        const overdue = []
        const upcoming = []
        const seen = new Set()

        // 1. Overdue months per active tenant (works even when no row exists for the month)
        for (const tenant of tenants.filter(t => !t.end_date)) {
            const property = properties.find(p => p.id === tenant.property_id)
            if (!property) continue
            const status = getPaymentStatus(property, tenant, payments, today)
            for (const key of status.overdueMonths) {
                const dueDate = monthStart(key)
                seen.add(`${property.id}:${key}`)
                overdue.push({
                    id: `${property.id}-${key}`,
                    propertyId: property.id,
                    tenantName: tenant.name,
                    propertyName: property.name,
                    amount: property.monthly_rent,
                    dueDate,
                    dueMonth: key,
                    diffDays: Math.max(1, Math.ceil((today - dueDate) / 86400000))
                })
            }
        }

        // 2. Upcoming: unpaid rows due soon
        for (const p of payments.filter(p => p.payment_status !== 'paid' && !p.voided)) {
            const key = monthKeyOf(p)
            if (!key || seen.has(`${p.property_id}:${key}`)) continue
            const dueDate = monthStart(key)
            if (dueDate < today || dueDate > sevenDaysFromNow) continue
            const tenant = tenants.find(t => t.property_id === p.property_id && !t.end_date)
            if (!tenant) continue
            const property = properties.find(pr => pr.id === p.property_id)
            upcoming.push({
                id: p.id,
                propertyId: p.property_id,
                tenantName: tenant.name,
                propertyName: property?.name ?? 'Propiedad desconocida',
                amount: p.rent_amount ?? property?.monthly_rent ?? 0,
                dueDate,
                dueMonth: key,
                paymentId: p.id,
                diffDays: Math.ceil((dueDate - today) / 86400000)
            })
        }

        overdue.sort((a, b) => a.dueDate - b.dueDate)
        upcoming.sort((a, b) => a.dueDate - b.dueDate)
        return { overdue, upcoming, total: overdue.length + upcoming.length }
    }, [payments, tenants, properties])
}

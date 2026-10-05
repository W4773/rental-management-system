// src/hooks/useAlerts.js
import { useMemo } from 'react'

/**
 * Computes payment alerts from already-fetched data.
 * Returns overdue (past due) and upcoming (due within 7 days) unpaid payments.
 * @param {Array} payments - from usePayments()
 * @param {Array} tenants  - from useTenants()
 * @param {Array} properties - from useProperties()
 */
export function useAlerts(payments = [], tenants = [], properties = []) {
    return useMemo(() => {
        const today = new Date(); today.setHours(0, 0, 0, 0)
        const sevenDaysFromNow = new Date(today); sevenDaysFromNow.setDate(today.getDate() + 7)

        const overdue = [], upcoming = []

        for (const p of payments.filter(p => p.payment_status !== 'paid')) {
            const dueDate = new Date(p.payment_month.split('T')[0] + 'T00:00:00')
            const tenant = tenants.find(t => t.property_id === p.property_id && !t.end_date)
            const property = properties.find(pr => pr.id === p.property_id)
            const alert = {
                id: p.id,
                propertyId: p.property_id,
                tenantName: tenant?.name ?? 'Inquilino desconocido',
                propertyName: property?.name ?? 'Propiedad desconocida',
                amount: p.rent_amount ?? property?.monthly_rent ?? 0,
                dueDate,
                dueMonth: p.payment_month?.split('T')[0].slice(0, 7),
                paymentId: p.id,
            }
            if (dueDate < today) {
                overdue.push({ ...alert, diffDays: Math.ceil((today - dueDate) / 86400000) })
            } else if (dueDate <= sevenDaysFromNow) {
                upcoming.push({ ...alert, diffDays: Math.ceil((dueDate - today) / 86400000) })
            }
        }
        overdue.sort((a, b) => a.dueDate - b.dueDate)
        upcoming.sort((a, b) => a.dueDate - b.dueDate)
        return { overdue, upcoming, total: overdue.length + upcoming.length }
    }, [payments, tenants, properties])
}

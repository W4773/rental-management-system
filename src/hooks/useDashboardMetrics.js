import { useMemo } from 'react'

/**
 * Home indicators, computed in memory from the data the app already holds (no requests of its own).
 * `overdueAmount` is added by AppContext from the month-by-month status logic.
 */
export const useDashboardMetrics = ({ properties, tenants, payments, loading, year = new Date().getFullYear() }) => {
    return useMemo(() => {
        const yearPayments = payments.filter(p => (p.payment_month || '').startsWith(`${year}-`))
        const totalRevenue = yearPayments.reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0)

        const now = new Date()
        const activeTenants = tenants.filter(t => !t.end_date)
        const rented = activeTenants.length
        const occupancyRate = properties.length > 0 ? Math.round((rented / properties.length) * 100) : 0

        if (year !== now.getFullYear()) {
            return { totalRevenue, collectionRate: 100, occupancyRate: 100, overdueAmount: 0, alerts: [], loading, error: null }
        }

        // Months marked "nulo" (not charged) are not expected
        const voided = yearPayments.filter(p => p.voided && activeTenants.some(t => t.id === p.tenant_id)).length
        const expected = Math.max(0, rented * (now.getMonth() + 1) - voided)
        // pending / void marks have type 'full' but no money
        const received = yearPayments.filter(p => p.payment_type === 'full' && parseFloat(p.amount_paid || 0) > 0).length
        const collectionRate = expected > 0 ? Math.round((received / expected) * 100) : 100

        return { totalRevenue, collectionRate, occupancyRate, overdueAmount: 0, alerts: [], loading, error: null }
    }, [properties, tenants, payments, loading, year])
}

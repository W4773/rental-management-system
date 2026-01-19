import { useMemo } from 'react'
import {
    calculateYearlyIncome,
    calculateYearlyPending,
    calculateExpectedIncome,
    calculateCollectionRate
} from '../lib/calculations'

export function useMetrics(properties, tenants, payments, selectedYear) {
    const metrics = useMemo(() => {
        const income = calculateYearlyIncome(payments, selectedYear)
        const pending = calculateYearlyPending(payments, selectedYear)
        const expected = calculateExpectedIncome(properties, tenants, selectedYear)
        // 3. Collection Rate
        const collectionRate = expected > 0
            ? Math.round((income / expected) * 100)
            : 0

        // 4. Projected Annual Income (Recibido + Pendiente + Futuro Contratos)
        // Futuro = (Meses restantes * alquiler de propiedades ocupadas)
        const currentMonthIndex = new Date().getMonth() // 0-11
        const monthsRemaining = 11 - currentMonthIndex

        let futureInvoiced = 0

        properties.forEach(property => {
            // Check if property has active tenant
            const hasActiveTenant = tenants.some(t =>
                t.property_id === property.id && t.end_date === null
            )

            if (hasActiveTenant) {
                futureInvoiced += (property.monthly_rent * monthsRemaining)
            }
        })

        const projectedIncome = income + pending + futureInvoiced

        return {
            income,
            pending,
            collectionRate,
            projectedIncome
        }
    }, [properties, tenants, payments, selectedYear])

    return metrics
}

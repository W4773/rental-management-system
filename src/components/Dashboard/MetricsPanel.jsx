import { useMemo, useState } from 'react'
import { formatCurrency } from '../../lib/calculations'

export default function MetricsPanel({ properties = [], tenants = [], payments = [], gasReadings = [] }) {
    const [selectedYear] = useState(new Date().getFullYear())

    const safeProps = Array.isArray(properties) ? properties : []
    const safeTenants = Array.isArray(tenants) ? tenants : []
    const safePayments = Array.isArray(payments) ? payments : []
    const safeGas = Array.isArray(gasReadings) ? gasReadings : []

    const metrics = useMemo(() => {
        // 1. Total Rent Income for selected Year
        const rentIncome = safePayments
            .filter(p => new Date(p.payment_date).getFullYear() === selectedYear)
            .reduce((sum, p) => sum + (parseFloat(p.amount_paid) || 0), 0)

        // 2. Gas Income (PAID) for selected Year
        const gasIncome = safeGas
            .filter(g => g.paid && new Date(g.payment_date).getFullYear() === selectedYear)
            .reduce((sum, g) => sum + (parseFloat(g.total_cost) || 0), 0)

        // TOTAL INCOME = Rent + Gas Paid
        const totalIncome = rentIncome + gasIncome

        // 3. Pending Rent Calculation
        const expectedAnnualRent = safeProps.reduce((sum, property) => {
            const hasActiveTenant = safeTenants.some(t =>
                t.property_id === property.id && t.end_date === null
            )
            if (hasActiveTenant) {
                return sum + (property.monthly_rent * 12)
            }
            return sum
        }, 0)

        // 3. Pending Gas Calculation (NEW)
        const pendingGas = safeGas
            .filter(g => !g.paid) // Unpaid gas
            .reduce((sum, g) => sum + (parseFloat(g.total_cost) || 0), 0)

        // Total Pending = (Expected Rent - Paid Rent) + Unpaid Gas
        const pendingRent = Math.max(0, expectedAnnualRent - rentIncome)
        const totalPending = pendingRent + pendingGas

        return {
            totalIncome,
            rentIncome,
            gasIncome,
            pending: totalPending,
            pendingGas,
            pendingRent
        }
    }, [safeProps, safeTenants, safePayments, safeGas, selectedYear])

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Income Card */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-gray-500 font-medium">Ingresos Totales {selectedYear}</h3>
                    <span className="text-green-500 bg-green-50 px-2 py-1 rounded text-xs font-bold">Recibido</span>
                </div>
                <p className="text-3xl font-bold text-gray-800">{formatCurrency(metrics.totalIncome)}</p>
                <div className="text-xs text-gray-500 mt-2 space-y-1">
                    <p>Alquiler: {formatCurrency(metrics.rentIncome)}</p>
                    <p>Gas: {formatCurrency(metrics.gasIncome)}</p>
                </div>
            </div>

            {/* Pending Card (Includes Gas) */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-gray-500 font-medium">Total Pendiente</h3>
                    <span className="text-red-500 bg-red-50 px-2 py-1 rounded text-xs font-bold">Por cobrar</span>
                </div>
                <p className="text-3xl font-bold text-gray-800">{formatCurrency(metrics.pending)}</p>
                <div className="text-xs text-gray-500 mt-2 space-y-1">
                    <p>Alquiler: {formatCurrency(metrics.pendingRent)}</p>
                    <p>Gas: {formatCurrency(metrics.pendingGas)}</p>
                </div>
            </div>
        </div>
    )
}

import { useMemo } from 'react'
import { formatCurrency } from '../../lib/calculations'

export default function SummaryCards({ properties = [], tenants = [] }) {
    // Safe guards in case props are null/undefined
    const safeProperties = Array.isArray(properties) ? properties : []
    const safeTenants = Array.isArray(tenants) ? tenants : []

    const stats = useMemo(() => {
        const totalProps = safeProperties.length
        const activeTenants = safeTenants.filter(t => t.end_date === null).length

        const occupancyRate = totalProps > 0 ? (activeTenants / totalProps) * 100 : 0

        const potentialIncome = safeProperties.reduce((sum, p) => sum + (p.monthly_rent || 0), 0)

        return { totalProps, activeTenants, occupancyRate, potentialIncome }
    }, [safeProperties, safeTenants])

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card
                title="Propiedades"
                value={stats.totalProps}
                icon="🏢"
                color="blue"
            />
            <Card
                title="Inquilinos Activos"
                value={stats.activeTenants}
                icon="👥"
                color="green"
            />
            <Card
                title="Ocupación"
                value={`${stats.occupancyRate.toFixed(0)}%`}
                icon="📊"
                color="purple"
            />
            <Card
                title="Renta Potencial"
                value={formatCurrency(stats.potentialIncome)}
                icon="💰"
                color="orange"
            />
        </div>
    )
}

function Card({ title, value, icon, color }) {
    const colors = {
        blue: 'bg-blue-500',
        green: 'bg-green-500',
        purple: 'bg-purple-500',
        orange: 'bg-orange-500'
    }

    return (
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
                <p className="text-sm text-gray-500 font-medium">{title}</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
            </div>
            <div className={`p-3 rounded-full ${colors[color]} bg-opacity-10 text-xl`}>
                {icon}
            </div>
        </div>
    )
}

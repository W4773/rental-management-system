import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wallet, Building2, UserPlus, Plus, TrendingUp, Clock, Home as HomeIcon, Percent, Receipt } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useApp } from '../contexts/AppContext'
import { formatCurrency } from '../lib/calculations'
import { usePropertyFilters } from '../hooks/usePropertyFilters'
import PropertyFilters from '../components/Dashboard/PropertyFilters'
import PropertyList from '../components/Dashboard/PropertyList'

function Kpi({ icon: Icon, label, value, tone }) {
    const tones = {
        brand: ['text-brand-700', 'bg-brand-500'],
        red: ['text-red-600', 'bg-red-500'],
        green: ['text-green-700', 'bg-green-500'],
        amber: ['text-amber-600', 'bg-amber-500']
    }[tone]
    return (
        <div className="bg-white rounded-xl border border-brand-100 shadow-sm px-3 py-2 relative overflow-hidden">
            <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-wide text-gray-500 uppercase">
                <Icon className="w-3.5 h-3.5" />{label}
            </p>
            <p className={`text-xl font-bold leading-tight ${tones[0]}`}>{value}</p>
            <span className={`absolute bottom-0 left-0 h-0.5 w-full ${tones[1]} opacity-70`} />
        </div>
    )
}

export default function Home() {
    const navigate = useNavigate()
    const { properties, tenants, payments, buildings, metrics, loading, openPayment, openProperty, openTenant, openBuilding } = useApp()
    const filters = usePropertyFilters({ properties, tenants, payments })

    const recent = useMemo(() => [...payments]
        .filter(p => parseFloat(p.amount_paid) > 0)
        .sort((a, b) => (b.created_at || b.payment_date || '').localeCompare(a.created_at || a.payment_date || ''))
        .slice(0, 8), [payments])

    if (loading) {
        return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" /></div>
    }

    const goToProperty = (property) => navigate(`/propiedades?p=${property.id}`)
    const today = format(new Date(), "MMMM 'de' yyyy", { locale: es })

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h1 className="text-xl font-bold text-ink leading-tight">Inicio</h1>
                    <p className="text-xs text-gray-500 first-letter:uppercase">{today} · {properties.length} propiedades</p>
                </div>
                <div className="flex items-center gap-1.5">
                    <button onClick={() => openTenant()} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-medium hover:bg-gray-50">
                        <UserPlus className="w-3.5 h-3.5" /> Inquilino
                    </button>
                    <button onClick={() => openProperty()} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-medium hover:bg-gray-50">
                        <Plus className="w-3.5 h-3.5" /> Propiedad
                    </button>
                    <button onClick={() => openBuilding()} className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-medium hover:bg-gray-50">
                        <Building2 className="w-3.5 h-3.5" /> Edificio
                    </button>
                    <button onClick={() => openPayment()} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 text-white text-xs font-semibold shadow-sm hover:brightness-105">
                        <Wallet className="w-3.5 h-3.5" /> Registrar pago
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                <Kpi icon={TrendingUp} label={`Cobrado ${new Date().getFullYear()}`} value={formatCurrency(metrics.collected)} tone="brand" />
                <Kpi icon={Clock} label="Monto atrasado" value={formatCurrency(metrics.overdueAmount)} tone={metrics.overdueAmount > 0 ? 'red' : 'green'} />
                <Kpi icon={HomeIcon} label="Ocupación" value={`${metrics.occupancy}%`} tone="green" />
                <Kpi icon={Percent} label="Tasa de cobro" value={`${metrics.collectionRate}%`} tone={metrics.collectionRate >= 90 ? 'green' : 'amber'} />
            </div>

            <div className="bg-white rounded-xl border border-brand-100 shadow-sm p-2.5">
                <PropertyFilters filters={filters} buildings={buildings} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
                <section className="lg:col-span-3 bg-white rounded-xl border border-brand-100 shadow-sm overflow-hidden">
                    <header className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
                        <h2 className="flex items-center gap-1.5 text-sm font-bold"><Building2 className="w-4 h-4 text-brand-600" />Propiedades activas</h2>
                        <span className="text-xs text-gray-500">{filters.filtered.length} de {properties.length}</span>
                    </header>
                    <div className="max-h-[calc(100vh-330px)] min-h-[260px] overflow-y-auto">
                        <PropertyList
                            items={filters.filtered}
                            buildings={buildings}
                            dense
                            onSelect={goToProperty}
                            onPay={(p) => openPayment({ propertyId: p.id })}
                            onEditBuilding={openBuilding}
                        />
                    </div>
                </section>

                <section className="lg:col-span-2 bg-white rounded-xl border border-brand-100 shadow-sm overflow-hidden">
                    <header className="px-3 py-2 border-b border-gray-100">
                        <h2 className="flex items-center gap-1.5 text-sm font-bold"><Receipt className="w-4 h-4 text-brand-600" />Actividad reciente</h2>
                    </header>
                    {recent.length === 0 ? (
                        <p className="p-6 text-center text-sm text-gray-500">Aún no hay pagos registrados.</p>
                    ) : (
                        <ul className="divide-y divide-gray-100 max-h-[calc(100vh-330px)] min-h-[260px] overflow-y-auto">
                            {recent.map(p => {
                                const property = properties.find(x => x.id === p.property_id)
                                const tenant = tenants.find(t => t.id === p.tenant_id)
                                return (
                                    <li key={p.id} className="flex items-center gap-2 px-3 py-1.5">
                                        <span className="w-7 h-7 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0"><Wallet className="w-3.5 h-3.5" /></span>
                                        <div className="min-w-0 flex-1 leading-tight">
                                            <p className="text-[13px] font-medium truncate">{tenant?.name || 'Inquilino'}</p>
                                            <p className="text-[11px] text-gray-500 truncate">{property?.name} · {format(new Date(p.payment_month.slice(0, 7) + '-01T00:00:00'), 'MMM yyyy', { locale: es })}</p>
                                        </div>
                                        <span className="text-xs font-bold text-green-700">{formatCurrency(p.amount_paid)}</span>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </section>
            </div>
        </div>
    )
}

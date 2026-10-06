import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Building2, MapPin, Pencil, Plus, Search, Home as HomeIcon, UserPlus, Wallet, Percent, Clock, AlertTriangle } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { formatCurrency } from '../lib/calculations'
import { normalizeText } from '../lib/paymentStatus'
import { getBuildingUnits, buildingStats } from '../lib/buildingStats'
import StatusPill from '../components/Dashboard/StatusPill'
import Kpi from '../components/Common/Kpi'

const FILTERS = [
    ['all', 'Todas'],
    ['occupied', 'Ocupadas'],
    ['vacant', 'Vacantes'],
    ['late', 'Atrasadas']
]

export default function BuildingDetail() {
    const { id } = useParams()
    const { buildings, properties, tenants, payments, loading, openBuilding, openProperty, openTenant, openPayment } = useApp()
    const [filter, setFilter] = useState('all')
    const [query, setQuery] = useState('')

    const building = buildings.find(b => b.id === id) || null
    const units = useMemo(
        () => building ? getBuildingUnits(building, properties, tenants, payments) : [],
        [building, properties, tenants, payments]
    )
    const stats = useMemo(() => buildingStats(units), [units])

    const shown = useMemo(() => {
        const words = normalizeText(query).split(/\s+/).filter(Boolean)
        return units.filter(u => {
            if (filter === 'occupied' && !u.tenant) return false
            if (filter === 'vacant' && u.tenant) return false
            if (filter === 'late' && u.status.key !== 'late') return false
            const hay = normalizeText(`${u.property.name} ${u.property.unit_number || ''} ${u.tenant?.name || ''}`)
            return words.every(w => hay.includes(w))
        })
    }, [units, filter, query])

    if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" /></div>

    if (!building) {
        return (
            <div className="bg-white rounded-xl border border-dashed border-brand-200 p-8 text-center space-y-3">
                <AlertTriangle className="w-8 h-8 mx-auto text-amber-500" />
                <p className="text-sm text-gray-600">No se encontró este edificio. Puede haber sido eliminado.</p>
                <Link to="/edificios" className="inline-block px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-semibold">Volver a Edificios</Link>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            <Link to="/edificios" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline">
                <ArrowLeft className="w-3.5 h-3.5" /> Edificios
            </Link>

            <div className="flex flex-wrap items-start gap-3">
                <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-400 to-brand-500 text-white flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5" />
                </span>
                <div className="min-w-0 flex-1">
                    <h1 className="text-xl font-bold text-ink leading-tight">{building.name}</h1>
                    <p className="flex items-center gap-1 text-sm text-gray-500">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />{building.address || 'Sin dirección'}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => openBuilding(building)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50">
                        <Pencil className="w-3.5 h-3.5" /> Editar edificio
                    </button>
                    <button onClick={() => openProperty(null, { buildingId: building.id })} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-brand-500 to-brand-400 text-white text-xs font-semibold shadow-sm hover:brightness-105">
                        <Plus className="w-3.5 h-3.5" /> Agregar propiedad
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <Kpi icon={HomeIcon} label="Unidades" value={stats.total} />
                <Kpi icon={Percent} label="Ocupación" value={`${stats.occupied}/${stats.total} · ${stats.occupancy}%`} tone={stats.vacant > 0 ? 'amber' : 'green'} />
                <Kpi icon={Wallet} label="Renta mensual" value={formatCurrency(stats.rent)} />
                <Kpi icon={Clock} label="Monto atrasado" value={formatCurrency(stats.owed)} tone={stats.owed > 0 ? 'red' : 'green'} />
                <Kpi icon={AlertTriangle} label="Atrasadas" value={stats.late} tone={stats.late > 0 ? 'red' : 'green'} />
            </div>

            <section className="bg-white rounded-xl border border-brand-200 shadow-sm">
                <div className="flex flex-wrap items-center gap-2 p-3 border-b border-gray-100">
                    <div className="relative flex-1 min-w-[12rem]">
                        <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar propiedad o inquilino..." aria-label="Buscar en este edificio"
                            className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
                    </div>
                    <div className="flex gap-1">
                        {FILTERS.map(([key, label]) => (
                            <button key={key} onClick={() => setFilter(key)} aria-pressed={filter === key}
                                className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition ${filter === key ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'}`}>
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {units.length === 0 ? (
                    <div className="p-8 text-center">
                        <p className="text-sm text-gray-600 mb-3">Este edificio aún no tiene propiedades.</p>
                        <button onClick={() => openProperty(null, { buildingId: building.id })} className="px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-semibold">+ Agregar propiedad</button>
                    </div>
                ) : shown.length === 0 ? (
                    <p className="p-6 text-center text-sm text-gray-500">Ninguna propiedad coincide con el filtro.</p>
                ) : (
                    <ul className="divide-y divide-gray-100">
                        {shown.map(({ property, tenant, status }) => (
                            <li key={property.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2">
                                <div className="min-w-0 flex-1 basis-48">
                                    <Link to={`/propiedades?p=${property.id}`} className="text-sm font-semibold text-ink hover:text-brand-700 truncate block">{property.name}</Link>
                                    <p className="text-xs text-gray-500 truncate">{tenant ? tenant.name : 'Vacante'}{property.unit_number ? ` · ${property.unit_number}` : ''}</p>
                                </div>
                                <span className="text-sm font-semibold text-gray-700 w-28 text-right">{formatCurrency(property.monthly_rent)}</span>
                                <div className="w-44"><StatusPill status={status} showDetail align="left" /></div>
                                <div className="flex gap-1.5">
                                    {tenant ? (
                                        <button onClick={() => openPayment({ propertyId: property.id })} className="flex items-center gap-1 px-2 py-1 rounded-md border border-brand-200 text-brand-700 text-xs font-semibold hover:bg-brand-50">
                                            <Wallet className="w-3.5 h-3.5" /> Cobrar
                                        </button>
                                    ) : (
                                        <button onClick={() => openTenant(property)} className="flex items-center gap-1 px-2 py-1 rounded-md bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700">
                                            <UserPlus className="w-3.5 h-3.5" /> Asignar inquilino
                                        </button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    )
}

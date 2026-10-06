import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Building2 } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { usePropertyFilters } from '../hooks/usePropertyFilters'
import PropertyFilters from '../components/Dashboard/PropertyFilters'
import PropertyList from '../components/Dashboard/PropertyList'
import PropertyDetails from '../components/Dashboard/PropertyDetails'

export default function Properties() {
    const { properties, tenants, payments, buildings, loading, openProperty, openBuilding, openPayment } = useApp()
    const [params, setParams] = useSearchParams()
    const filters = usePropertyFilters({ properties, tenants, payments })

    const selectedId = params.get('p')
    const selected = useMemo(() => properties.find(p => p.id === selectedId) || null, [properties, selectedId])

    // Default to the first property when none (or an invalid one) is selected
    useEffect(() => {
        if (!loading && !selected && properties.length > 0) {
            setParams({ p: properties[0].id }, { replace: true })
        }
    }, [loading, selected, properties])

    const select = (property) => setParams({ p: property.id })

    if (loading) {
        return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" /></div>
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
                <h1 className="flex items-center gap-2 text-xl font-bold">
                    Mis Propiedades
                    <span className="text-xs font-semibold bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">{properties.length}</span>
                </h1>
                <div className="flex items-center gap-1.5">
                    <button onClick={() => openBuilding()} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-medium hover:bg-gray-50">
                        <Building2 className="w-3.5 h-3.5" /> Nuevo edificio
                    </button>
                    <button onClick={() => openProperty()} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 text-white text-xs font-semibold shadow-sm hover:brightness-105">
                        <Plus className="w-3.5 h-3.5" /> Nueva propiedad
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
                <aside className="lg:col-span-4 xl:col-span-3 bg-white rounded-xl border border-brand-100 shadow-sm overflow-hidden lg:sticky lg:top-14">
                    <div className="p-2 border-b border-gray-100">
                        <PropertyFilters filters={filters} buildings={buildings} compact />
                    </div>
                    <div className="max-h-[320px] lg:max-h-[calc(100vh-170px)] overflow-y-auto">
                        <PropertyList
                            colorize
                            items={filters.filtered}
                            buildings={buildings}
                            selectedId={selected?.id}
                            onSelect={select}
                            onPay={(p) => openPayment({ propertyId: p.id })}
                            onEditBuilding={openBuilding}
                        />
                    </div>
                </aside>
                <section className="lg:col-span-8 xl:col-span-9 bg-white rounded-xl border border-brand-100 shadow-sm min-w-0">
                    <PropertyDetails property={selected} onDeleted={() => setParams({}, { replace: true })} />
                </section>
            </div>
        </div>
    )
}

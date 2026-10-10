import { useEffect, useMemo, useRef } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Building2, ChevronLeft } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import useIsMobile from '../hooks/useIsMobile'
import { usePropertyFilters } from '../hooks/usePropertyFilters'
import PropertyFilters from '../components/Dashboard/PropertyFilters'
import PropertyList from '../components/Dashboard/PropertyList'
import PropertyDetails from '../components/Dashboard/PropertyDetails'

export default function Properties() {
    const { properties, tenants, payments, buildings, loading, openProperty, openBuilding, openPayment } = useApp()
    const [params, setParams] = useSearchParams()
    const navigate = useNavigate()
    const location = useLocation()
    const isMobile = useIsMobile()
    const filters = usePropertyFilters({ properties, tenants, payments })

    const selectedId = params.get('p')
    const selected = useMemo(() => properties.find(p => p.id === selectedId) || null, [properties, selectedId])

    // Desktop: default to the first property. Phone: no auto-select, the list is the landing view.
    useEffect(() => {
        if (!isMobile && !loading && !selected && properties.length > 0) {
            setParams({ p: properties[0].id }, { replace: true })
        }
    }, [isMobile, loading, selected, properties])

    // Phone: the list scrolls with the page, so remember where it was and show each view from the right place.
    const listScroll = useRef(0)
    useEffect(() => {
        if (!isMobile) return
        window.scrollTo(0, selected ? 0 : listScroll.current)
    }, [isMobile, selected?.id])

    const select = (property) => {
        listScroll.current = window.scrollY
        setParams({ p: property.id }, { state: { fromList: true } })
    }
    // Came from the list in this session -> go back in history; opened by direct link -> just clear the id.
    const backToList = () => (location.state?.fromList ? navigate(-1) : setParams({}, { replace: true }))

    if (loading) {
        return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" /></div>
    }

    const showList = !isMobile || !selected
    const showDetail = !isMobile || !!selected

    return (
        <div className="space-y-3">
            {isMobile && selected ? (
                <button onClick={backToList} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700">
                    <ChevronLeft className="w-4 h-4" /> Propiedades
                </button>
            ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h1 className="flex items-center gap-2 text-xl font-bold">
                        Mis Propiedades
                        <span className="text-xs font-semibold bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">{properties.length}</span>
                    </h1>
                    <div className="flex items-center gap-1.5 max-md:w-full">
                        <button onClick={() => openBuilding()} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-medium hover:bg-gray-50 max-md:flex-1 max-md:justify-center">
                            <Building2 className="w-3.5 h-3.5" /> Nuevo edificio
                        </button>
                        <button onClick={() => openProperty()} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 text-white text-xs font-semibold shadow-sm hover:brightness-105 max-md:flex-1 max-md:justify-center">
                            <Plus className="w-3.5 h-3.5" /> Nueva propiedad
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
                {showList && (
                    <aside className="lg:col-span-4 xl:col-span-3 bg-white rounded-xl border border-brand-100 shadow-sm md:overflow-hidden max-md:overflow-clip lg:sticky lg:top-14">
                        <div className="p-2 border-b border-gray-100">
                            <PropertyFilters filters={filters} buildings={buildings} compact />
                        </div>
                        <div className="md:max-h-[320px] lg:max-h-[calc(100vh-170px)] md:overflow-y-auto">
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
                )}
                {showDetail && (
                    <section className="lg:col-span-8 xl:col-span-9 bg-white rounded-xl border border-brand-100 shadow-sm min-w-0">
                        <PropertyDetails property={selected} onDeleted={() => setParams({}, { replace: true })} />
                    </section>
                )}
            </div>
        </div>
    )
}

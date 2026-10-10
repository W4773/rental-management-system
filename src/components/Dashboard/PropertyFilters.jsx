import { Search, X } from 'lucide-react'
import { STATUS_FILTERS } from '../../lib/paymentStatus'

/** Search box + status chips + building select, driven by usePropertyFilters(). */
export default function PropertyFilters({ filters, buildings, compact = false }) {
    const { query, setQuery, status, setStatus, buildingId, setBuildingId, hasFilters, reset } = filters
    return (
        <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px] max-md:basis-full">
                <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar inquilino o propiedad..."
                    aria-label="Buscar inquilino o propiedad"
                    className="w-full pl-8 pr-8 max-md:pr-12 py-1.5 text-[13px] border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
                {query && (
                    <button onClick={() => setQuery('')} aria-label="Limpiar búsqueda" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>
            <div className="flex items-center gap-1 flex-wrap max-md:flex-nowrap max-md:basis-full max-md:overflow-x-auto scrollbar-none">
                {STATUS_FILTERS.map(f => (
                    <button
                        key={f.key}
                        onClick={() => setStatus(f.key)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border transition max-md:px-4 max-md:shrink-0 max-md:whitespace-nowrap ${
                            status === f.key ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-brand-400'}`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>
            {buildings.length > 0 && (
                <select
                    value={buildingId}
                    onChange={(e) => setBuildingId(e.target.value)}
                    aria-label="Filtrar por edificio"
                    className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white max-md:w-full"
                >
                    <option value="all">Todos los edificios</option>
                    {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    <option value="none">Sin edificio</option>
                </select>
            )}
            {hasFilters && !compact && (
                <button onClick={reset} className="text-xs text-brand-700 hover:underline">Limpiar</button>
            )}
        </div>
    )
}

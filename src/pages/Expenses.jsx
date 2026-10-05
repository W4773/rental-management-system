import { useMemo, useState } from 'react'
import { Flame, Plus, Search } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { formatCurrency } from '../lib/calculations'
import { formatDate } from '../lib/dateUtils'
import { normalizeText } from '../lib/metrics'

export default function Expenses() {
    const { gasReadings, properties, openGas, openPayGas, loading } = useApp()
    const [query, setQuery] = useState('')
    const [filter, setFilter] = useState('pending')

    const sum = (list) => list.reduce((s, g) => s + (parseFloat(g.total_cost) || 0), 0)
    const pending = gasReadings.filter(g => !g.paid)
    const paid = gasReadings.filter(g => g.paid)

    const rows = useMemo(() => {
        const q = normalizeText(query)
        return gasReadings
            .filter(g => filter === 'all' || (filter === 'paid' ? g.paid : !g.paid))
            .map(g => ({ reading: g, property: properties.find(p => p.id === g.property_id) }))
            .filter(({ property }) => !q || normalizeText(property?.name || '').includes(q))
            .sort((a, b) => b.reading.reading_date.localeCompare(a.reading.reading_date))
    }, [gasReadings, properties, query, filter])

    if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" /></div>

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h1 className="text-xl font-bold leading-tight">Gastos</h1>
                    <p className="text-xs text-gray-500">Consumo de gas por propiedad</p>
                </div>
                <button onClick={openGas} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 text-white text-xs font-semibold shadow-sm">
                    <Plus className="w-3.5 h-3.5" /> Registrar gas
                </button>
            </div>

            <div className="grid grid-cols-2 gap-2 max-w-xl">
                <div className="bg-white rounded-xl border border-brand-100 shadow-sm px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Pendiente ({pending.length})</p>
                    <p className="text-xl font-bold text-amber-600">{formatCurrency(sum(pending))}</p>
                </div>
                <div className="bg-white rounded-xl border border-brand-100 shadow-sm px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Pagado ({paid.length})</p>
                    <p className="text-xl font-bold text-green-700">{formatCurrency(sum(paid))}</p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-brand-100 shadow-sm p-2.5 flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[180px]">
                    <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar propiedad..." aria-label="Buscar propiedad"
                        className="w-full pl-8 pr-3 py-1.5 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>
                {[['pending', 'Pendientes'], ['paid', 'Pagados'], ['all', 'Todos']].map(([key, label]) => (
                    <button key={key} onClick={() => setFilter(key)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border ${filter === key ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-gray-200 text-gray-600'}`}>{label}</button>
                ))}
            </div>

            <div className="bg-white rounded-xl border border-brand-100 shadow-sm overflow-x-auto">
                <table className="w-full text-[13px]">
                    <thead className="bg-brand-50 text-[10px] uppercase tracking-wide text-gray-500">
                        <tr>
                            <th className="text-left px-3 py-2">Propiedad</th>
                            <th className="text-left px-3 py-2">Fecha</th>
                            <th className="text-right px-3 py-2 hidden sm:table-cell">Lectura</th>
                            <th className="text-right px-3 py-2 hidden sm:table-cell">Consumo</th>
                            <th className="text-right px-3 py-2">Costo</th>
                            <th className="text-left px-3 py-2">Estado</th>
                            <th className="px-3 py-2" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {rows.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-gray-500">No hay lecturas.</td></tr>}
                        {rows.map(({ reading, property }) => (
                            <tr key={reading.id} className="hover:bg-gray-50">
                                <td className="px-3 py-1.5 font-medium"><span className="inline-flex items-center gap-1.5"><Flame className="w-3.5 h-3.5 text-accent-500" />{property?.name || '-'}</span></td>
                                <td className="px-3 py-1.5">{formatDate(reading.reading_date)}</td>
                                <td className="px-3 py-1.5 text-right hidden sm:table-cell">{reading.current_reading}</td>
                                <td className="px-3 py-1.5 text-right hidden sm:table-cell">{reading.consumption_volume} GL</td>
                                <td className="px-3 py-1.5 text-right font-semibold">{formatCurrency(reading.total_cost)}</td>
                                <td className="px-3 py-1.5">
                                    <span className={`px-1.5 py-px rounded-full text-[10px] font-bold uppercase border ${reading.paid ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                        {reading.paid ? 'Pagado' : 'Pendiente'}
                                    </span>
                                </td>
                                <td className="px-3 py-1.5 text-right">
                                    {!reading.paid && <button onClick={() => openPayGas(reading)} className="px-2 py-0.5 rounded bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700">Pagar</button>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

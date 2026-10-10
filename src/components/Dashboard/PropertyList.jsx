import { useState } from 'react'
import { ChevronDown, ChevronRight, Pencil, Wallet, Building2 } from 'lucide-react'
import { formatCurrency } from '../../lib/calculations'
import { groupByBuilding } from '../../hooks/usePropertyFilters'
import StatusPill from './StatusPill'
import { useBuildingColors } from '../../lib/buildingColors'

function Row({ item, selected, onSelect, onPay, dense, color }) {
    const { property, tenant, status } = item
    return (
        <li>
            <div
                role="button"
                tabIndex={0}
                onClick={() => onSelect(property)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(property)}
                className={`group flex items-center gap-2 px-3 ${dense ? 'py-1.5' : 'py-2'} max-md:py-2.5 cursor-pointer border-l-[3px] transition ${
                    selected ? 'bg-brand-50 border-brand-500' : 'border-transparent hover:bg-gray-50'}`}
                style={color ? { borderLeftColor: color.solid, background: selected ? color.strong : undefined } : undefined}
            >
                <div className="min-w-0 flex-1">
                    <p className="text-[13px] max-md:text-sm font-semibold text-ink truncate leading-tight">{property.name}</p>
                    <p className="text-[11px] text-gray-500 truncate leading-tight uppercase" style={color && tenant ? { color: color.text } : undefined}>{tenant ? tenant.name : 'Sin inquilino'}</p>
                    {tenant && status.detail && (
                        <p className={`text-[10px] max-md:text-[11px] truncate leading-tight mt-px font-medium ${
                            status.key === 'late' ? 'text-red-600' : status.key === 'pending' ? 'text-amber-700' : 'text-gray-400'}`}>
                            {status.detail}
                        </p>
                    )}
                </div>
                <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-brand-700 leading-tight">{formatCurrency(property.monthly_rent)}</p>
                    <StatusPill status={status} />
                </div>
                {onPay && tenant && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onPay(property) }}
                        aria-label={`Registrar pago ${property.name}`}
                        title="Registrar pago"
                        className="p-1.5 rounded-md text-gray-400 hover:text-brand-700 hover:bg-brand-100 transition"
                    >
                        <Wallet className="w-4 h-4" />
                    </button>
                )}
            </div>
        </li>
    )
}

/** Compact list of properties, grouped by building (collapsible) when buildings exist. */
/** `colorize` paints each building's header and rows with its own colour (used in the detailed views). */
export default function PropertyList({ items, buildings, selectedId, onSelect, onPay, onEditBuilding, dense = false, colorize = false }) {
    const [collapsed, setCollapsed] = useState({})
    const colors = useBuildingColors(buildings)

    if (items.length === 0) {
        return <p className="p-6 text-center text-sm text-gray-500">No hay propiedades que coincidan.</p>
    }

    if (buildings.length === 0) {
        return (
            <ul className="divide-y divide-gray-100">
                {items.map(i => <Row key={i.property.id} item={i} dense={dense} selected={selectedId === i.property.id} onSelect={onSelect} onPay={onPay} />)}
            </ul>
        )
    }

    return (
        <div>
            {groupByBuilding(items, buildings).map(({ building, items: groupItems }) => {
                const key = building?.id || 'none'
                const isCollapsed = collapsed[key]
                const color = colorize && building ? colors[building.id] : null
                return (
                    <section key={key}>
                        <div className="sticky top-12 md:top-0 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-brand-50/90 backdrop-blur border-y border-brand-100"
                            style={color ? { background: color.strong, borderColor: color.border, borderLeft: `4px solid ${color.solid}` } : undefined}>
                            <button
                                onClick={() => setCollapsed(c => ({ ...c, [key]: !c[key] }))}
                                className="flex items-center gap-1.5 min-w-0 flex-1 text-left"
                                aria-expanded={!isCollapsed}
                            >
                                {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 shrink-0" />}
                                <Building2 className="w-3.5 h-3.5 text-brand-600 shrink-0" style={color ? { color: color.solid } : undefined} />
                                <span className="min-w-0">
                                    <span className="block text-xs font-bold text-brand-700 truncate" style={color ? { color: color.text } : undefined}>{building ? building.name : 'Sin edificio'}</span>
                                    {building?.address && <span className="block text-[10px] text-gray-500 truncate">{building.address}</span>}
                                </span>
                                <span className="ml-auto text-[10px] text-gray-500">{groupItems.length}</span>
                            </button>
                            {building && onEditBuilding && (
                                <button onClick={() => onEditBuilding(building)} aria-label={`Editar ${building.name}`} className="p-1 text-gray-400 hover:text-brand-700">
                                    <Pencil className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                        {!isCollapsed && (
                            <ul className="divide-y divide-gray-100">
                                {groupItems.map(i => <Row key={i.property.id} item={i} dense={dense} color={color} selected={selectedId === i.property.id} onSelect={onSelect} onPay={onPay} />)}
                            </ul>
                        )}
                    </section>
                )
            })}
        </div>
    )
}

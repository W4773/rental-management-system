import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, ChevronDown, Building2, Check } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import { normalizeText } from '../../lib/paymentStatus'

/** "Edificio · Inquilino" context line used in the list and under the selection. */
function useUnitContext(property) {
    const { buildings, tenants } = useApp()
    const building = buildings.find(b => b.id === property?.building_id) || null
    const tenant = tenants.find(t => t.property_id === property?.id && !t.end_date) || null
    return { building, tenant }
}

/** Compact "which property is this" line: name · building · address · tenant. For read-only displays. */
export function PropertyInfo({ property, className = '' }) {
    const { building, tenant } = useUnitContext(property)
    if (!property) return null
    return (
        <p className={`text-xs text-gray-600 ${className}`}>
            <span className="inline-flex items-center gap-1 font-semibold text-gray-800"><Building2 className="w-3 h-3" />{building ? building.name : 'Sin edificio'}</span>
            {(building?.address || property.address) && <span> · {building?.address || property.address}</span>}
            <span> · {tenant ? `Inquilino: ${tenant.name}` : 'Vacante'}</span>
        </p>
    )
}

/**
 * Searchable property selector. Several buildings can have a unit with the same name
 * ("APARTAMENTO 1-A"), so every option shows its building and tenant, and the search matches
 * property, building, address and tenant. `onChange` receives the property id.
 */
export default function PropertyPicker({
    properties = [], value, onChange, label = 'Propiedad', required = false, error, disabled = false,
    placeholder = 'Buscar por propiedad, edificio o inquilino...', showInfo = true,
    onlyVacant = false, buildingId = null, keepId = null
}) {
    const { buildings, tenants } = useApp()
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const [active, setActive] = useState(0)
    const rootRef = useRef(null)
    const listRef = useRef(null)

    const items = useMemo(() => properties.filter(p => !buildingId || p.building_id === buildingId).map(property => {
        const building = buildings.find(b => b.id === property.building_id) || null
        const tenant = tenants.find(t => t.property_id === property.id && !t.end_date) || null
        return {
            property, building, tenant,
            haystack: normalizeText(`${property.name} ${building?.name || ''} ${building?.address || ''} ${property.address || ''} ${tenant?.name || ''}`)
        }
    }).filter(i => !onlyVacant || !i.tenant || i.property.id === keepId), [properties, buildings, tenants, onlyVacant, buildingId, keepId])

    const selected = items.find(i => i.property.id === value) || null

    const results = useMemo(() => {
        const words = normalizeText(query).split(/\s+/).filter(Boolean)
        return items
            .filter(i => words.every(w => i.haystack.includes(w)))
            .sort((a, b) => (a.building?.name || '~').localeCompare(b.building?.name || '~') || a.property.name.localeCompare(b.property.name, 'es', { numeric: true }))
    }, [items, query])

    useEffect(() => { setActive(0) }, [query, open])

    useEffect(() => {
        if (!open) return
        const handler = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false) }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [open])

    useEffect(() => {
        listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
    }, [active, open])

    const choose = (item) => {
        onChange(item.property.id)
        setOpen(false)
        setQuery('')
    }

    const onKeyDown = (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive(a => Math.min(results.length - 1, a + 1)) }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(0, a - 1)) }
        else if (e.key === 'Enter' && open) { e.preventDefault(); if (results[active]) choose(results[active]) }
        else if (e.key === 'Escape' && open) { e.stopPropagation(); setOpen(false); setQuery('') }
    }

    const shown = open ? query : (selected ? `${selected.property.name}${selected.building ? ` · ${selected.building.name}` : ''}` : '')
    let lastGroup = null

    return (
        <div className="mb-3" ref={rootRef}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}{required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                    type="text"
                    role="combobox"
                    aria-expanded={open}
                    aria-controls="property-picker-list"
                    aria-label={label}
                    autoComplete="off"
                    disabled={disabled}
                    value={shown}
                    placeholder={placeholder}
                    onFocus={() => setOpen(true)}
                    onClick={() => setOpen(true)}
                    onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
                    onKeyDown={onKeyDown}
                    className={`w-full pl-9 pr-8 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${error ? 'border-red-500' : 'border-gray-300'}`}
                />
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />

                {open && (
                    <ul id="property-picker-list" role="listbox" ref={listRef}
                        className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl">
                        {results.length === 0 && <li className="px-3 py-3 text-sm text-gray-500 text-center">Sin resultados para "{query}"</li>}
                        {results.map((item, i) => {
                            const group = item.building?.name || 'Sin edificio'
                            const header = group !== lastGroup
                            lastGroup = group
                            const isSel = item.property.id === value
                            return (
                                <li key={item.property.id} role="presentation">
                                    {header && (
                                        <div className="sticky top-0 px-3 py-1 bg-brand-50 border-y border-brand-100 text-[10px] font-bold uppercase tracking-wide text-brand-700 flex items-center gap-1">
                                            <Building2 className="w-3 h-3" />{group}
                                        </div>
                                    )}
                                    <div
                                        role="option"
                                        aria-selected={isSel}
                                        data-active={i === active}
                                        onMouseDown={(e) => { e.preventDefault(); choose(item) }}
                                        onMouseEnter={() => setActive(i)}
                                        className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer ${i === active ? 'bg-brand-50' : ''}`}
                                    >
                                        <div className="min-w-0 flex-1 leading-tight">
                                            <p className="text-[13px] font-semibold text-gray-900 truncate">{item.property.name}</p>
                                            <p className="text-[11px] text-gray-500 truncate">
                                                {item.tenant ? item.tenant.name : 'Vacante'}
                                                {(item.building?.address || item.property.address) ? ` · ${item.building?.address || item.property.address}` : ''}
                                            </p>
                                        </div>
                                        {isSel && <Check className="w-4 h-4 text-brand-600 shrink-0" />}
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                )}
            </div>
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
            {showInfo && selected && (
                <div className="mt-1.5 px-2.5 py-1.5 rounded-lg bg-brand-50 border border-brand-100">
                    <PropertyInfo property={selected.property} />
                </div>
            )}
        </div>
    )
}

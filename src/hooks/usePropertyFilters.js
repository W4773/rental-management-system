import { useMemo, useState } from 'react'
import { getPaymentStatus, normalizeText } from '../lib/paymentStatus'

/** Search + filters over properties, enriched with active tenant and payment status. */
export function usePropertyFilters({ properties, tenants, payments }) {
    const [query, setQuery] = useState('')
    const [status, setStatus] = useState('all')
    const [buildingId, setBuildingId] = useState('all')

    const items = useMemo(() => properties.map(property => {
        const tenant = tenants.find(t => t.property_id === property.id && !t.end_date) || null
        return { property, tenant, status: getPaymentStatus(property.id, !!tenant, payments) }
    }), [properties, tenants, payments])

    const filtered = useMemo(() => {
        const q = normalizeText(query)
        return items.filter(({ property, tenant, status: st }) => {
            if (q && !normalizeText(`${property.name} ${tenant?.name || ''}`).includes(q)) return false
            if (status !== 'all' && st.key !== status) return false
            if (buildingId === 'none' && property.building_id) return false
            if (buildingId !== 'all' && buildingId !== 'none' && property.building_id !== buildingId) return false
            return true
        })
    }, [items, query, status, buildingId])

    const hasFilters = query !== '' || status !== 'all' || buildingId !== 'all'
    const reset = () => { setQuery(''); setStatus('all'); setBuildingId('all') }

    return { items, filtered, query, setQuery, status, setStatus, buildingId, setBuildingId, hasFilters, reset }
}

/** Group enriched items by building -> [{ building|null, items }] (buildings first, "Sin edificio" last). */
export function groupByBuilding(items, buildings) {
    const groups = buildings
        .map(building => ({ building, items: items.filter(i => i.property.building_id === building.id) }))
        .filter(g => g.items.length > 0)
    const orphans = items.filter(i => !buildings.some(b => b.id === i.property.building_id))
    if (orphans.length > 0) groups.push({ building: null, items: orphans })
    return groups
}

import { getPaymentStatus } from './paymentStatus'

/** Natural alphabetical order of units: 1-A, 2-A, 10-A. */
export const compareUnits = (a, b) => (a.name || '').localeCompare(b.name || '', 'es', { numeric: true, sensitivity: 'base' })

/** Unit = property + its active tenant + payment status. */
export function enrichUnit(property, tenants, payments) {
    const tenant = tenants.find(t => t.property_id === property.id && !t.end_date) || null
    return { property, tenant, status: getPaymentStatus(property, tenant, payments) }
}

export function getBuildingUnits(building, properties, tenants, payments) {
    return properties
        .filter(p => p.building_id === building.id)
        .map(p => enrichUnit(p, tenants, payments))
        .sort((a, b) => compareUnits(a.property, b.property))
}

export function buildingStats(units) {
    const occupied = units.filter(u => u.tenant).length
    return {
        total: units.length,
        occupied,
        vacant: units.length - occupied,
        occupancy: units.length ? Math.round((occupied / units.length) * 100) : 0,
        rent: units.reduce((s, u) => s + (parseFloat(u.property.monthly_rent) || 0), 0),
        pending: units.filter(u => u.status.key === 'pending').length,
        late: units.filter(u => u.status.key === 'late').length,
        owed: units.reduce((s, u) => s + (u.status.owedAmount || 0), 0)
    }
}

import { formatCurrency } from './calculations'
import { formatMonthKey } from './paymentStatus'

const UTILITY_LABEL = { gas: 'gas', electricity: 'luz', water: 'agua' }

const monthsText = (months = []) => {
    const keys = months.filter(Boolean).sort()
    if (keys.length === 0) return ''
    if (keys.length === 1) return formatMonthKey(keys[0])
    return `${formatMonthKey(keys[0], keys[0].slice(0, 4) !== keys[keys.length - 1].slice(0, 4))} – ${formatMonthKey(keys[keys.length - 1])}`
}

/**
 * Turns an activity_log row into display text. Names come from the live data when the entity still
 * exists and fall back to the snapshot stored in `meta`.
 * Returns { kind: 'payment'|'property'|'tenant'|'building'|'utility'|'team'|'document', tone: 'create'|'update'|'delete', title, subtitle }.
 */
export function describeActivity(entry, { properties = [], tenants = [], buildings = [] }) {
    const meta = entry.meta || {}
    const property = properties.find(p => p.id === meta.property_id)
    const tenant = tenants.find(t => t.id === meta.tenant_id)
    const propName = property?.name || meta.property_name
    const join = (...parts) => parts.filter(Boolean).join(' · ')

    switch (entry.action) {
        case 'payment.create':
            return { kind: 'payment', tone: 'create', title: (meta.months?.length || 0) > 1 ? `Pagos registrados (${meta.months.length} meses)` : 'Pago registrado',
                subtitle: join(tenant?.name, propName, monthsText(meta.months), meta.amount != null && formatCurrency(meta.amount)) }
        case 'payment.delete':
            return { kind: 'payment', tone: 'delete', title: 'Pago eliminado', subtitle: join(tenant?.name, propName, monthsText(meta.months), meta.amount != null && formatCurrency(meta.amount)) }
        case 'payment.update':
            return { kind: 'payment', tone: 'update', title: 'Pago editado', subtitle: join(tenant?.name, propName, monthsText(meta.months), meta.amount != null && formatCurrency(meta.amount)) }
        case 'payment.pending':
            return { kind: 'payment', tone: 'update', title: (meta.months?.length || 0) > 1 ? `${meta.months.length} meses marcados como pendientes` : 'Mes marcado como pendiente',
                subtitle: join(tenant?.name, propName, monthsText(meta.months)) }
        case 'payment.void':
            return { kind: 'payment', tone: 'delete', title: (meta.months?.length || 0) > 1 ? `${meta.months.length} meses marcados como nulos` : 'Mes marcado como nulo',
                subtitle: join(tenant?.name, propName, monthsText(meta.months), meta.reason) }
        case 'payment.unmark':
            return { kind: 'payment', tone: 'update', title: 'Marca de mes quitada', subtitle: join(propName, monthsText(meta.months)) }
        case 'property.create':
            return { kind: 'property', tone: 'create', title: 'Propiedad creada', subtitle: join(meta.name, meta.rent != null && formatCurrency(meta.rent)) }
        case 'property.update':
            return { kind: 'property', tone: 'update', title: 'Propiedad editada', subtitle: meta.name || propName || '' }
        case 'property.delete':
            return { kind: 'property', tone: 'delete', title: 'Propiedad eliminada', subtitle: meta.name || '' }
        case 'tenant.assign':
            return { kind: 'tenant', tone: 'create', title: 'Inquilino asignado', subtitle: join(meta.name, propName) }
        case 'tenant.update':
            return { kind: 'tenant', tone: 'update', title: 'Inquilino editado', subtitle: join(meta.name || tenant?.name, propName) }
        case 'tenant.unassign':
            return { kind: 'tenant', tone: 'delete', title: 'Inquilino desasignado', subtitle: join(meta.name || tenant?.name, propName) }
        case 'utility.create':
            return { kind: 'utility', tone: 'create', title: `Lectura de ${UTILITY_LABEL[meta.type] || 'servicio'} registrada`, subtitle: join(propName, meta.amount != null && formatCurrency(meta.amount)) }
        case 'utility.paid':
            return { kind: 'utility', tone: 'create', title: `${(UTILITY_LABEL[meta.type] || 'Servicio').replace(/^./, c => c.toUpperCase())} pagado`, subtitle: join(propName, meta.amount != null && formatCurrency(meta.amount)) }
        case 'utility.update':
            return { kind: 'utility', tone: 'update', title: `Lectura de ${UTILITY_LABEL[meta.type] || 'servicio'} editada`, subtitle: propName || '' }
        case 'building.create':
            return { kind: 'building', tone: 'create', title: 'Edificio creado', subtitle: meta.name || '' }
        case 'building.update':
            return { kind: 'building', tone: 'update', title: 'Edificio editado', subtitle: meta.name || buildings.find(b => b.id === entry.entity_id)?.name || '' }
        case 'building.delete':
            return { kind: 'building', tone: 'delete', title: 'Edificio eliminado', subtitle: meta.name || '' }
        case 'team.add':
            return { kind: 'team', tone: 'create', title: 'Miembro agregado al equipo', subtitle: meta.email || '' }
        case 'team.remove':
            return { kind: 'team', tone: 'delete', title: 'Miembro quitado del equipo', subtitle: meta.email || '' }
        case 'document.receipt':
            return { kind: 'document', tone: 'update', title: 'Recibo generado', subtitle: join(tenant?.name, propName, monthsText(meta.months)) }
        case 'document.report':
            return { kind: 'document', tone: 'update', title: 'Reporte de pagos generado', subtitle: join(propName, meta.period) }
        default:
            return { kind: 'document', tone: 'update', title: entry.action, subtitle: '' }
    }
}

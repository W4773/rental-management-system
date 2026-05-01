// src/components/Dashboard/PropertyCarousel.jsx
import { formatCurrency } from '../../lib/calculations'

function getPaymentStatus(property, tenants, payments) {
    const tenant = tenants.find(t => t.property_id === property.id && !t.end_date)
    if (!tenant) return { label: 'VACANTE', badgeClass: null }

    const today = new Date(); today.setHours(0, 0, 0, 0)
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

    const currentPaid = payments.find(p =>
        p.property_id === property.id &&
        p.payment_month?.slice(0, 7) === currentMonth &&
        p.payment_status === 'paid'
    )
    if (currentPaid) return { label: 'AL DÍA', badgeClass: 'wp-badge-green' }

    const unpaid = payments
        .filter(p => p.property_id === property.id && p.payment_status !== 'paid')
        .sort((a, b) => new Date(a.payment_month) - new Date(b.payment_month))

    if (unpaid.length === 0) return { label: 'AL DÍA', badgeClass: 'wp-badge-green' }

    const firstOfOldest = new Date(unpaid[0].payment_month.slice(0, 7) + '-01T00:00:00')
    const daysSince = Math.floor((today - firstOfOldest) / 86400000)

    if (daysSince > 30) return { label: 'ATRASADO', badgeClass: 'wp-badge-red' }
    return { label: 'PENDIENTE', badgeClass: 'wp-badge-amber' }
}

export default function PropertyGrid({ properties = [], tenants = [], payments = [], onSelectProperty, selectedProperty }) {
    if (properties.length === 0) {
        return (
            <div className="wp-card" style={{ padding: 32, textAlign: 'center' }}>
                <p style={{ fontSize: 28, marginBottom: 8 }}>🏠</p>
                <p style={{ color: 'var(--wp-text-muted)', fontWeight: 600, fontSize: 13 }}>Sin propiedades registradas</p>
            </div>
        )
    }

    return (
        <div className="wp-card" style={{ overflow: 'hidden' }}>
            {properties.map((property, idx) => {
                const tenant = tenants.find(t => t.property_id === property.id && !t.end_date)
                const status = getPaymentStatus(property, tenants, payments)
                const isSelected = selectedProperty?.id === property.id

                return (
                    <div
                        key={property.id}
                        onClick={() => onSelectProperty(property)}
                        style={{
                            padding: '11px 14px',
                            borderBottom: idx < properties.length - 1 ? '1px solid #f5f0e8' : 'none',
                            borderLeft: isSelected ? '3px solid var(--wp-gold)' : '3px solid transparent',
                            background: isSelected ? 'var(--wp-amber-bg)' : 'transparent',
                            cursor: 'pointer',
                            transition: 'background .12s, border-color .12s',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 8,
                        }}
                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--wp-amber-bg)' }}
                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                    >
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="wp-title" style={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {property.name}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--wp-text-muted)', marginTop: 2 }}>
                                {tenant ? tenant.name : 'Sin inquilino'}
                            </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--wp-gold)' }}>
                                {formatCurrency(property.monthly_rent)}
                            </div>
                            {status.badgeClass
                                ? <span className={status.badgeClass} style={{ fontSize: 9, marginTop: 3, display: 'inline-block' }}>{status.label}</span>
                                : <span style={{ fontSize: 9, color: 'var(--wp-text-muted)', display: 'block', marginTop: 3 }}>{status.label}</span>
                            }
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

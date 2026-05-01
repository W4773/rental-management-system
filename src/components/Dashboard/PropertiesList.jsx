// src/components/Dashboard/PropertiesList.jsx
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
    if (currentPaid) return { label: 'PAGADO', badgeClass: 'wp-badge-green' }

    const unpaid = payments
        .filter(p => p.property_id === property.id && p.payment_status !== 'paid')
        .sort((a, b) => new Date(a.payment_month) - new Date(b.payment_month))

    if (unpaid.length === 0) return { label: 'PAGADO', badgeClass: 'wp-badge-green' }

    const firstOfOldest = new Date(unpaid[0].payment_month.slice(0, 7) + '-01T00:00:00')
    const daysSince = Math.floor((today - firstOfOldest) / 86400000)

    if (daysSince > 30) return { label: 'ATRASADO', badgeClass: 'wp-badge-red' }
    return { label: 'PENDIENTE', badgeClass: 'wp-badge-amber' }
}

export default function PropertiesList({ properties = [], tenants = [], payments = [], onSelectProperty, onAddProperty }) {
    return (
        <div className="wp-card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--wp-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="wp-title" style={{ fontSize: 13 }}>🏠 Propiedades Activas</span>
                <button onClick={onAddProperty} title="Agregar propiedad" style={{ width: 26, height: 26, background: 'var(--wp-amber-bg)', border: '1px solid var(--wp-border)', borderRadius: 6, cursor: 'pointer', fontSize: 15, color: 'var(--wp-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
            </div>
            {properties.length === 0 && (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--wp-text-muted)', fontSize: 12 }}>Sin propiedades registradas</div>
            )}
            {properties.map(property => {
                const tenant = tenants.find(t => t.property_id === property.id && !t.end_date)
                const { label, badgeClass } = getPaymentStatus(property, tenants, payments)
                return (
                    <div key={property.id} onClick={() => onSelectProperty(property)}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--wp-amber-bg)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        style={{ padding: '10px 16px', borderBottom: '1px solid #f5f0e8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'background .12s' }}
                    >
                        <div>
                            <div className="wp-title" style={{ fontSize: 11 }}>{property.name}</div>
                            <div style={{ fontSize: 10, color: 'var(--wp-text-muted)', marginTop: 1 }}>
                                {tenant ? tenant.name : 'Sin inquilino'}
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--wp-gold)' }}>
                                RD${Number(property.monthly_rent ?? 0).toLocaleString('es-DO')}
                            </div>
                            {badgeClass && <span className={badgeClass} style={{ marginTop: 3, display: 'inline-block', fontSize: 9 }}>{label}</span>}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

// src/components/Dashboard/ActivityFeed.jsx
function formatDate(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
    if (d.toDateString() === today.toDateString()) return 'Hoy'
    if (d.toDateString() === yesterday.toDateString()) return 'Ayer'
    return d.toLocaleDateString('es-DO', { day: 'numeric', month: 'short' })
}

export default function ActivityFeed({ payments = [], tenants = [], properties = [] }) {
    const items = payments.filter(p => p.paid).slice(0, 8).map(p => {
        const tenant = tenants.find(t => t.property_id === p.property_id && !t.end_date)
            ?? tenants.find(t => t.property_id === p.property_id)
        const property = properties.find(pr => pr.id === p.property_id)
        return {
            id: p.id,
            icon: '💰',
            title: `Pago recibido${tenant ? ` — ${tenant.first_name} ${tenant.last_name}` : ''}`,
            subtitle: `${property?.name ?? 'Propiedad'} · RD$${Number(p.amount ?? property?.rent_price ?? 0).toLocaleString('es-DO')}`,
            date: p.payment_date ?? p.created_at,
        }
    })
    return (
        <div className="wp-card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--wp-border)' }}>
                <span className="wp-title" style={{ fontSize: 13 }}>📋 Actividad Reciente</span>
            </div>
            {items.length === 0 && (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--wp-text-muted)', fontSize: 12 }}>Sin actividad reciente</div>
            )}
            {items.map(item => (
                <div key={item.id} style={{ padding: '10px 16px', borderBottom: '1px solid #f5f0e8', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 30, height: 30, background: 'var(--wp-green-bg)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{item.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--wp-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                        <div style={{ fontSize: 10, color: 'var(--wp-text-muted)', marginTop: 1 }}>{item.subtitle}</div>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--wp-gold)', fontWeight: 700, whiteSpace: 'nowrap' }}>{formatDate(item.date)}</div>
                </div>
            ))}
        </div>
    )
}

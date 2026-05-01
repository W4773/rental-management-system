import { useState } from 'react'

function getTenantPaymentStatus(tenant, payments) {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

    const currentPaid = payments.find(p =>
        p.property_id === tenant.property_id &&
        p.payment_month?.slice(0, 7) === currentMonth &&
        p.payment_status === 'paid'
    )
    if (currentPaid) return { label: 'AL DÍA', badgeClass: 'wp-badge-green' }

    const unpaid = payments
        .filter(p => p.property_id === tenant.property_id && p.payment_status !== 'paid')
        .sort((a, b) => new Date(a.payment_month) - new Date(b.payment_month))

    if (unpaid.length === 0) return { label: 'AL DÍA', badgeClass: 'wp-badge-green' }

    const firstOfOldest = new Date(unpaid[0].payment_month.slice(0, 7) + '-01T00:00:00')
    const daysSince = Math.floor((today - firstOfOldest) / 86400000)

    if (daysSince > 30) return { label: 'ATRASADO', badgeClass: 'wp-badge-red' }
    return { label: 'PENDIENTE', badgeClass: 'wp-badge-amber' }
}

export default function TenantSection({ tenants, properties, payments = [], onNewTenant, onUnassignTenant, onEditTenant }) {
    const [confirmingId, setConfirmingId] = useState(null)

    const activeTenants = tenants.filter(t => t.end_date === null)

    const getProperty = (propertyId) => properties.find(p => p.id === propertyId)

    const handleUnassign = async (tenantId) => {
        await onUnassignTenant(tenantId)
        setConfirmingId(null)
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                    <h2 className="wp-title" style={{ fontSize: 18 }}>Inquilinos Activos</h2>
                    <span className="wp-badge-amber">{activeTenants.length}</span>
                </div>
                <button className="wp-btn-primary" onClick={onNewTenant}>
                    + Nuevo Inquilino
                </button>
            </div>

            {activeTenants.length === 0 ? (
                <div className="wp-card" style={{ padding: 32, textAlign: 'center' }}>
                    <p style={{ fontSize: 32, marginBottom: 8 }}>👤</p>
                    <p style={{ color: 'var(--wp-text-muted)', fontWeight: 600 }}>No hay inquilinos activos</p>
                    <p style={{ color: 'var(--wp-text-muted)', fontSize: 13, marginTop: 4 }}>Haz clic en "Nuevo Inquilino" para asignar uno.</p>
                </div>
            ) : (
                <div className="wp-card" style={{ overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="w-full" style={{ fontSize: 14 }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--wp-border)' }}>
                                    {['Propiedad', 'Inquilino', 'Cédula', 'Teléfono', 'Email', 'Ingreso', 'Estado Pago', ''].map(h => (
                                        <th key={h} style={{ padding: '10px 14px', textAlign: h === '' ? 'right' : 'left', fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--wp-text-muted)' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {activeTenants.map((tenant, idx) => {
                                    const prop = getProperty(tenant.property_id)
                                    const isConfirming = confirmingId === tenant.id
                                    const payStatus = getTenantPaymentStatus(tenant, payments)

                                    return (
                                        <tr
                                            key={tenant.id}
                                            style={{ borderBottom: idx < activeTenants.length - 1 ? '1px solid #f5f0e8' : 'none' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'var(--wp-amber-bg)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--wp-text)' }}>{prop?.name || '—'}</td>
                                            <td style={{ padding: '10px 14px', color: 'var(--wp-text)' }}>{tenant.name}</td>
                                            <td style={{ padding: '10px 14px', color: 'var(--wp-text-muted)', fontFamily: 'monospace', fontSize: 12 }}>{tenant.identity_number}</td>
                                            <td style={{ padding: '10px 14px', color: 'var(--wp-text-muted)' }}>{tenant.phone}</td>
                                            <td style={{ padding: '10px 14px', color: 'var(--wp-text-muted)' }}>{tenant.email || '—'}</td>
                                            <td style={{ padding: '10px 14px', color: 'var(--wp-text-muted)' }}>
                                                {tenant.start_date
                                                    ? new Date(tenant.start_date + 'T00:00:00').toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' })
                                                    : '—'}
                                            </td>
                                            <td style={{ padding: '10px 14px' }}>
                                                <span className={payStatus.badgeClass} style={{ fontSize: 9 }}>{payStatus.label}</span>
                                            </td>
                                            <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                                                {isConfirming ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                                                        <span style={{ fontSize: 11, color: 'var(--wp-text-muted)' }}>¿Confirmar?</span>
                                                        <button onClick={() => handleUnassign(tenant.id)} className="wp-badge-red" style={{ cursor: 'pointer', border: 'none', padding: '3px 8px', borderRadius: 4 }}>Sí</button>
                                                        <button onClick={() => setConfirmingId(null)} className="wp-btn-secondary" style={{ fontSize: 11, padding: '3px 8px' }}>No</button>
                                                    </div>
                                                ) : (
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                                                        <button onClick={() => onEditTenant(tenant)} style={{ fontSize: 12, color: 'var(--wp-gold)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>Editar</button>
                                                        <span style={{ color: 'var(--wp-border)' }}>|</span>
                                                        <button onClick={() => setConfirmingId(tenant.id)} style={{ fontSize: 12, color: 'var(--wp-red)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>Desasignar</button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}

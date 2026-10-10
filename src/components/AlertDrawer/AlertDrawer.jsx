// src/components/AlertDrawer/AlertDrawer.jsx
import { useEffect, useRef } from 'react'
import useIsMobile from '../../hooks/useIsMobile'

function formatDiff(diffDays, isOverdue) {
    if (isOverdue) return diffDays === 1 ? 'Vencido ayer' : `Vencido hace ${diffDays} días`
    if (diffDays === 0) return 'Vence hoy'
    if (diffDays === 1) return 'Vence mañana'
    return `Vence en ${diffDays} días`
}

function AlertItem({ alert, isOverdue, onPayClick }) {
    return (
        <div style={{ padding: '10px 16px', borderBottom: '1px solid #f5f0e8', display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--wp-text)' }}>{alert.tenantName}</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--wp-gold)' }}>
                    RD${Number(alert.amount).toLocaleString('es-DO')}
                </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--wp-text-muted)' }}>{alert.propertyName}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                <span className={isOverdue ? 'wp-badge-red' : 'wp-badge-amber'}>
                    {formatDiff(alert.diffDays, isOverdue)}
                </span>
                {onPayClick && (
                    <button onClick={() => onPayClick(alert)} style={{
                        fontSize: 10, fontWeight: 700, color: 'var(--wp-gold)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        textDecoration: 'underline', padding: 0,
                    }}>Registrar pago →</button>
                )}
            </div>
        </div>
    )
}

export default function AlertDrawer({ isOpen, onClose, overdue = [], upcoming = [], onPayClick }) {
    const drawerRef = useRef(null)
    const total = overdue.length + upcoming.length
    const isMobile = useIsMobile()

    useEffect(() => {
        if (!isOpen) return
        const handler = e => { if (drawerRef.current && !drawerRef.current.contains(e.target)) onClose() }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [isOpen, onClose])

    useEffect(() => {
        const handler = e => { if (e.key === 'Escape') onClose() }
        document.addEventListener('keydown', handler)
        return () => document.removeEventListener('keydown', handler)
    }, [onClose])

    return (
        <>
            {isOpen && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.15)', zIndex: 49, backdropFilter: 'blur(1px)' }} aria-hidden="true" />}
            <aside ref={drawerRef} role="dialog" aria-label="Panel de alertas de pago" style={{
                position: 'fixed', bottom: 0, zIndex: 50,
                background: 'var(--wp-surface)',
                display: 'flex', flexDirection: 'column',
                transition: 'transform .25s ease',
                ...(isMobile
                    ? {
                        left: 0, right: 0, maxHeight: '85dvh',
                        borderTop: '1px solid var(--wp-border)', borderRadius: '16px 16px 0 0',
                        boxShadow: '0 -4px 20px rgba(0,0,0,.10)', paddingBottom: 'env(safe-area-inset-bottom)',
                        transform: isOpen ? 'translateY(0)' : 'translateY(100%)'
                    }
                    : {
                        top: 0, right: 0, width: 300,
                        borderLeft: '1px solid var(--wp-border)', boxShadow: '-4px 0 20px rgba(0,0,0,.10)',
                        transform: isOpen ? 'translateX(0)' : 'translateX(100%)'
                    }),
            }}>
                {/* Header */}
                <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--wp-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18 }}>🔔</span>
                    <span className="wp-title" style={{ fontSize: 14, flex: 1 }}>Alertas de Pago</span>
                    {total > 0 && <span className="wp-badge-amber">{total} activas</span>}
                    <button onClick={onClose} aria-label="Cerrar panel" style={{
                        width: 28, height: 28, border: '1px solid var(--wp-border)', borderRadius: 6,
                        background: 'transparent', cursor: 'pointer', fontSize: 14,
                        color: 'var(--wp-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>✕</button>
                </div>

                {/* Empty state */}
                {total === 0 && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24, color: 'var(--wp-text-muted)' }}>
                        <span style={{ fontSize: 36 }}>✅</span>
                        <p style={{ fontSize: 13, textAlign: 'center', fontWeight: 600 }}>Sin alertas pendientes</p>
                        <p style={{ fontSize: 11, textAlign: 'center' }}>Todos los pagos están al día</p>
                    </div>
                )}

                {/* List */}
                {total > 0 && (
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {overdue.length > 0 && (
                            <>
                                <div style={{ padding: '10px 16px 4px', fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--wp-red)' }}>
                                    ● Vencidos ({overdue.length})
                                </div>
                                {overdue.map(a => <AlertItem key={a.id} alert={a} isOverdue onPayClick={onPayClick} />)}
                            </>
                        )}
                        {upcoming.length > 0 && (
                            <>
                                <div style={{ padding: '10px 16px 4px', fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#b45309' }}>
                                    ◌ Próximos 7 días ({upcoming.length})
                                </div>
                                {upcoming.map(a => <AlertItem key={a.id} alert={a} isOverdue={false} onPayClick={onPayClick} />)}
                            </>
                        )}
                    </div>
                )}

                {/* Footer */}
                {total > 0 && (
                    <div style={{ padding: '12px 16px', borderTop: '1px solid var(--wp-border)' }}>
                        <button className="wp-btn-primary" style={{ width: '100%', padding: 10, fontSize: 13, textAlign: 'center' }} onClick={onClose}>
                            Ver todos los pagos
                        </button>
                    </div>
                )}
            </aside>
        </>
    )
}

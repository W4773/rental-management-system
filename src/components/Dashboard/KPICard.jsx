// src/components/Dashboard/KPICard.jsx
export default function KPICard({ title, value, status = 'default', barWidth = null, icon }) {
    const colors = {
        default: { value: 'var(--wp-gold)',  bar: 'var(--wp-gold-gradient)' },
        success: { value: 'var(--wp-green)', bar: 'var(--wp-green)' },
        danger:  { value: 'var(--wp-red)',   bar: 'var(--wp-red)' },
        warning: { value: '#b45309',          bar: 'var(--wp-amber)' },
    }
    const c = colors[status] ?? colors.default
    return (
        <div className="wp-card" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--wp-text-muted)', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 5 }}>
                {icon && <span>{icon}</span>}{title}
            </div>
            <div style={{ fontFamily: 'Georgia, serif', fontWeight: 900, fontSize: 22, color: c.value, lineHeight: 1 }}>
                {value}
            </div>
            {barWidth !== null && (
                <div style={{ marginTop: 8, height: 3, background: 'var(--wp-bg)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, barWidth))}%`, background: c.bar, borderRadius: 2, transition: 'width .4s ease' }} />
                </div>
            )}
        </div>
    )
}

// src/components/Layout/TopNav.jsx
const SECTIONS = [
    { id: 'resumen',     icon: '📊', label: 'Dashboard' },
    { id: 'propiedades', icon: '🏠', label: 'Propiedades' },
    { id: 'inquilinos',  icon: '👤', label: 'Inquilinos' },
    { id: 'gastos',      icon: '📝', label: 'Gastos' },
]

export default function TopNav({ activeSection, onSectionChange, alertCount = 0, onAlertClick }) {
    return (
        <nav className="sticky top-0 z-30" style={{ background: 'var(--wp-surface)', borderBottom: '1px solid var(--wp-border)', boxShadow: 'var(--wp-shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 20px', height: '54px' }}>
                {/* Brand */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginRight: 28 }}>
                    <div style={{ width: 32, height: 32, background: 'var(--wp-gold-gradient)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🏠</div>
                    <span style={{ fontFamily: 'Georgia, serif', fontWeight: 800, fontSize: 14, color: 'var(--wp-text)' }}>Alquiler Pro</span>
                </div>

                {/* Nav links */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                    {SECTIONS.map(s => (
                        <button key={s.id} onClick={() => onSectionChange(s.id)} style={{
                            padding: '6px 13px', fontSize: 13,
                            fontWeight: activeSection === s.id ? 700 : 500,
                            color: activeSection === s.id ? 'var(--wp-gold)' : 'var(--wp-text-muted)',
                            background: activeSection === s.id ? 'var(--wp-amber-bg)' : 'transparent',
                            border: activeSection === s.id ? '1px solid var(--wp-border)' : '1px solid transparent',
                            borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                            <span>{s.icon}</span><span>{s.label}</span>
                        </button>
                    ))}
                </div>

                {/* Right side */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button onClick={onAlertClick} title="Ver alertas de pagos" style={{
                        position: 'relative', width: 36, height: 36,
                        background: alertCount > 0 ? 'var(--wp-amber-bg)' : 'var(--wp-surface)',
                        border: `1px solid ${alertCount > 0 ? 'var(--wp-amber)' : 'var(--wp-border)'}`,
                        borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', fontSize: 16,
                    }}>
                        🔔
                        {alertCount > 0 && (
                            <span style={{
                                position: 'absolute', top: -5, right: -5,
                                background: 'var(--wp-red)', color: '#fff',
                                fontSize: 9, fontWeight: 800, width: 17, height: 17,
                                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: '2px solid var(--wp-surface)',
                            }}>{alertCount > 9 ? '9+' : alertCount}</span>
                        )}
                    </button>
                    <a href="/settings" title="Configuración" style={{
                        width: 36, height: 36, background: 'var(--wp-surface)',
                        border: '1px solid var(--wp-border)', borderRadius: 9,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16, textDecoration: 'none',
                    }}>⚙️</a>
                    <div style={{
                        width: 32, height: 32, background: 'var(--wp-gold-gradient)',
                        borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, fontSize: 13, color: '#fff',
                    }}>W</div>
                </div>
            </div>
        </nav>
    )
}

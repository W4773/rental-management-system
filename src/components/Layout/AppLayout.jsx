// src/components/Layout/AppLayout.jsx
import TopNav from './TopNav'

export default function AppLayout({ activeSection, onSectionChange, alertCount = 0, onAlertClick, children }) {
    return (
        <div style={{ minHeight: '100vh', background: 'var(--wp-bg)', display: 'flex', flexDirection: 'column' }}>
            <TopNav
                activeSection={activeSection}
                onSectionChange={onSectionChange}
                alertCount={alertCount}
                onAlertClick={onAlertClick}
            />
            <main style={{ flex: 1, padding: '24px 20px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
                {children}
            </main>
        </div>
    )
}

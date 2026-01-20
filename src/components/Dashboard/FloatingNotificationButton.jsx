import { useState } from 'react'

export default function FloatingNotificationButton({ alerts = [] }) {
    const [isOpen, setIsOpen] = useState(false)

    const alertCount = alerts.length

    if (alertCount === 0) return null

    return (
        <>
            {/* Floating Button */}
            <button
                className="floating-notification-btn"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Ver alertas"
            >
                <span className="notification-icon">🔔</span>
                {alertCount > 0 && (
                    <span className="notification-badge">{alertCount}</span>
                )}
            </button>

            {/* Notification Panel */}
            {isOpen && (
                <>
                    <div className="notification-overlay" onClick={() => setIsOpen(false)} />
                    <div className="notification-panel">
                        <div className="notification-header">
                            <h3>Notificaciones</h3>
                            <button onClick={() => setIsOpen(false)} className="notification-close">✕</button>
                        </div>
                        <div className="notification-list">
                            {alerts.map((alert) => (
                                <div key={alert.id} className="notification-item">
                                    <div className={`alert-icon ${alert.type}`}>
                                        {alert.type === 'error' && '!'}
                                        {alert.type === 'warning' && '⚠'}
                                        {alert.type === 'info' && 'ℹ'}
                                    </div>
                                    <div className="alert-content">
                                        <div className="alert-title">{alert.title}</div>
                                        <div className="alert-subtitle">{alert.subtitle}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </>
    )
}

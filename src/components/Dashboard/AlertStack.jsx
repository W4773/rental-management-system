export default function AlertStack({ alerts = [] }) {
    if (alerts.length === 0) {
        return (
            <div className="alert-stack">
                <div className="alert-item" style={{ borderLeft: '4px solid #22c55e' }}>
                    <div className="alert-icon success">
                        ✓
                    </div>
                    <div className="alert-content">
                        <div className="alert-title">Todo al día</div>
                        <div className="alert-subtitle">No hay pagos pendientes</div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="alert-stack">
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937' }}>
                Acciones Requeridas ({alerts.length})
            </h3>

            {alerts.map((alert) => (
                <div key={alert.id} className="alert-item">
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
    )
}

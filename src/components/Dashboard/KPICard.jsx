export default function KPICard({ title, value, trend, status, detail, icon }) {
    const getStatusClass = () => {
        switch (status) {
            case 'success': return 'status-success'
            case 'warning': return 'status-warning'
            case 'error': return 'status-error'
            default: return ''
        }
    }

    const getTrendClass = () => {
        if (!trend) return 'neutral'
        const trendValue = parseFloat(trend)
        if (trendValue > 0) return ''
        if (trendValue < 0) return 'down'
        return 'neutral'
    }

    return (
        <div className={`kpi-card ${getStatusClass()}`}>
            <div className="kpi-header">
                <h3 className="kpi-label">
                    {icon && <span style={{ marginRight: '0.5rem' }}>{icon}</span>}
                    {title}
                </h3>
                {trend && (
                    <span className={`kpi-trend ${getTrendClass()}`}>
                        {parseFloat(trend) > 0 && '↑ '}
                        {parseFloat(trend) < 0 && '↓ '}
                        {trend}
                    </span>
                )}
            </div>

            <div className="kpi-value">{value}</div>

            {detail && (
                <div className="kpi-detail">
                    {detail}
                </div>
            )}
        </div>
    )
}

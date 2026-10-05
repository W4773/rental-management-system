export default function StatusPill({ status }) {
    if (!status.badgeClass) {
        return (
            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--wp-text-muted)', letterSpacing: '.04em' }}>{status.label}</span>
        )
    }
    return <span className={status.badgeClass} style={{ fontSize: 9, display: 'inline-block' }}>{status.label}</span>
}

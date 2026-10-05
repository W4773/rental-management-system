/** Status badge. With `showDetail` it adds a small line such as "Debe jul – sep 2026 (3 meses)". */
export default function StatusPill({ status, showDetail = false, align = 'right' }) {
    const badge = status.badgeClass
        ? <span className={status.badgeClass} style={{ fontSize: 9, display: 'inline-block' }}>{status.label}</span>
        : <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--wp-text-muted)', letterSpacing: '.04em' }}>{status.label}</span>
    if (!showDetail || !status.detail) return badge
    const color = status.key === 'late' ? 'text-red-600' : status.key === 'pending' ? 'text-amber-700' : 'text-gray-500'
    return (
        <span className={`inline-flex flex-col ${align === 'right' ? 'items-end text-right' : 'items-start text-left'}`}>
            {badge}
            <span className={`text-[10px] leading-tight mt-0.5 ${color}`}>{status.detail}</span>
        </span>
    )
}

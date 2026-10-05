const STYLES = {
    green: 'bg-green-50 text-green-700 border-green-200',
    yellow: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    gray: 'bg-gray-100 text-gray-500 border-gray-200'
}

export default function StatusPill({ status }) {
    return (
        <span className={`inline-block px-1.5 py-px rounded-full border text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${STYLES[status.color]}`}>
            {status.label}
        </span>
    )
}

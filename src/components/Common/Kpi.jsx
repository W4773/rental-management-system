export default function Kpi({ icon: Icon, label, value, tone = 'brand' }) {
    const tones = {
        brand: ['text-brand-700', 'bg-brand-500'],
        red: ['text-red-600', 'bg-red-500'],
        green: ['text-green-700', 'bg-green-500'],
        amber: ['text-amber-600', 'bg-amber-500']
    }[tone]
    return (
        <div className="bg-white rounded-xl border border-brand-100 shadow-sm px-3 py-2 relative overflow-hidden min-w-0">
            <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-wide text-gray-500 uppercase">
                <Icon className="w-3.5 h-3.5" />{label}
            </p>
            <p className={`text-xl font-bold leading-tight break-words ${tones[0]}`}>{value}</p>
            <span className={`absolute bottom-0 left-0 h-0.5 w-full ${tones[1]} opacity-70`} />
        </div>
    )
}

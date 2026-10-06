import { Link } from 'react-router-dom'
import { formatCurrency } from '../../lib/calculations'

export const compact = (n) => {
    const v = Math.abs(n)
    const s = v >= 1e6 ? `${(v / 1e6).toFixed(v >= 1e7 ? 0 : 1)}M` : v >= 1e3 ? `${Math.round(v / 1e3)}K` : `${Math.round(v)}`
    return `${n < 0 ? '-' : ''}${s}`
}

const niceMax = (max) => {
    if (max <= 0) return 1
    const pow = 10 ** Math.floor(Math.log10(max))
    const n = max / pow
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow
}

/** Monthly bars: collected (solid) against what was due (outlined marker). */
export function MonthlyChart({ data, color = '#b8962e' }) {
    const W = 720, H = 240, L = 44, R = 8, T = 12, B = 28
    const max = niceMax(Math.max(...data.map(d => Math.max(d.collected, d.expected)), 0))
    const bw = (W - L - R) / data.length
    const y = (v) => T + (H - T - B) * (1 - v / max)
    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Cobrado por mes">
            {[0, 0.25, 0.5, 0.75, 1].map(t => (
                <g key={t}>
                    <line x1={L} x2={W - R} y1={y(max * t)} y2={y(max * t)} stroke="#ece6d6" />
                    <text x={L - 6} y={y(max * t) + 3} fontSize="10" textAnchor="end" fill="#8a8272">{compact(max * t)}</text>
                </g>
            ))}
            {data.map((d, i) => {
                const x = L + i * bw + bw * 0.18
                const w = bw * 0.64
                return (
                    <g key={d.label}>
                        <title>{`${d.label}: cobrado ${formatCurrency(d.collected)} · esperado ${formatCurrency(d.expected)}`}</title>
                        {d.expected > 0 && <rect x={x} y={y(d.expected)} width={w} height={y(0) - y(d.expected)} rx="3" fill="none" stroke={color} strokeDasharray="3 3" opacity="0.7" />}
                        <rect x={x} y={y(d.collected)} width={w} height={Math.max(0, y(0) - y(d.collected))} rx="3" fill={color} />
                        <text x={x + w / 2} y={H - 10} fontSize="10.5" textAnchor="middle" fill="#6b6455">{d.label}</text>
                    </g>
                )
            })}
        </svg>
    )
}

/** Horizontal bars: one row per item with its own colour; `secondary` draws a lighter stacked segment (e.g. owed). */
export function HBars({ rows, valueKey = 'value', secondaryKey, format = formatCurrency }) {
    const max = Math.max(...rows.map(r => (r[valueKey] || 0) + (secondaryKey ? r[secondaryKey] || 0 : 0)), 1)
    return (
        <ul className="space-y-2">
            {rows.map(r => {
                const a = r[valueKey] || 0
                const b = secondaryKey ? r[secondaryKey] || 0 : 0
                return (
                    <li key={r.key}>
                        <div className="flex items-baseline justify-between gap-2 text-xs">
                            {r.to
                                ? <Link to={r.to} className="font-semibold text-ink truncate hover:text-brand-700 hover:underline">{r.label}</Link>
                                : <span className="font-semibold text-ink truncate">{r.label}</span>}
                            <span className="text-gray-500 shrink-0">
                                <span className="font-bold" style={{ color: r.color }}>{format(a)}</span>
                                {secondaryKey && b > 0 && <span className="text-red-600 ml-2">pendiente {format(b)}</span>}
                            </span>
                        </div>
                        <div className="h-3 mt-1 rounded-full bg-gray-100 overflow-hidden flex">
                            <div style={{ width: `${(a / max) * 100}%`, background: r.color }} className="h-full" />
                            {b > 0 && <div style={{ width: `${(b / max) * 100}%`, background: r.color, opacity: 0.28 }} className="h-full" />}
                        </div>
                    </li>
                )
            })}
        </ul>
    )
}

/** Donut with centre label and legend. segments = [{ key, label, value, color }] */
export function Donut({ segments, centerLabel, centerValue }) {
    const total = segments.reduce((s, x) => s + x.value, 0)
    const R = 52, C = 2 * Math.PI * R
    let offset = 0
    return (
        <div className="flex items-center gap-4 flex-wrap">
            <svg viewBox="0 0 140 140" className="w-36 h-36 shrink-0" role="img" aria-label="Estado de las unidades">
                <circle cx="70" cy="70" r={R} fill="none" stroke="#f1ede2" strokeWidth="18" />
                {total > 0 && segments.filter(s => s.value > 0).map(s => {
                    const len = (s.value / total) * C
                    const el = <circle key={s.key} cx="70" cy="70" r={R} fill="none" stroke={s.color} strokeWidth="18"
                        strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} transform="rotate(-90 70 70)"><title>{`${s.label}: ${s.value}`}</title></circle>
                    offset += len
                    return el
                })}
                <text x="70" y="68" textAnchor="middle" fontSize="22" fontWeight="700" fill="#2b2416">{centerValue}</text>
                <text x="70" y="84" textAnchor="middle" fontSize="9" fill="#8a8272">{centerLabel}</text>
            </svg>
            <ul className="space-y-1 text-xs">
                {segments.map(s => (
                    <li key={s.key} className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full ring-2 shrink-0" style={{ background: s.color, '--tw-ring-color': `${s.color}33` }} />
                        <span className="text-gray-700">{s.label}</span>
                        <span className="font-bold text-ink ml-auto pl-3">{s.value}</span>
                    </li>
                ))}
            </ul>
        </div>
    )
}

/** Collected per year. */
export function YearBars({ rows, color = '#b8962e' }) {
    const max = Math.max(...rows.map(r => r.collected), 1)
    return (
        <div className="flex items-end gap-3 h-36">
            {rows.map(r => (
                <div key={r.year} className="flex-1 min-w-0 flex flex-col items-center justify-end h-full" title={`${r.year}: ${formatCurrency(r.collected)}`}>
                    <span className="text-[10px] font-semibold text-gray-600 mb-1">{compact(r.collected)}</span>
                    <div className="w-full max-w-[56px] rounded-t-md" style={{ height: `${Math.max(4, (r.collected / max) * 100)}%`, background: color }} />
                    <span className="text-[11px] text-gray-600 mt-1">{r.year}</span>
                </div>
            ))}
        </div>
    )
}

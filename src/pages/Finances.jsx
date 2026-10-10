import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Wallet, Target, Percent, Clock, TrendingUp, Download, Search, Mail, ArrowUpDown, Home as HomeIcon } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { formatCurrency } from '../lib/calculations'
import { computeFinance, financeYears } from '../lib/finance'
import { normalizeText } from '../lib/paymentStatus'
import Kpi from '../components/Common/Kpi'
import StatusPill from '../components/Dashboard/StatusPill'
import { MonthlyChart, HBars, Donut, YearBars } from '../components/Finance/Charts'

const GOLD = '#b8962e'
const STATUS_COLORS = { paid: '#22c55e', pending: '#facc15', late: '#ef4444', vacant: '#d1d5db' }

const Card = ({ title, subtitle, children, className = '' }) => (
    <section className={`bg-white rounded-xl border border-brand-100 shadow-sm p-4 ${className}`}>
        <h2 className="text-sm font-bold text-ink">{title}</h2>
        {subtitle && <p className="text-[11px] text-gray-500 mb-3">{subtitle}</p>}
        {!subtitle && <div className="mb-3" />}
        {children}
    </section>
)

const Stat = ({ label, value, className = '' }) => (
    <div className="min-w-0">
        <dt className="text-[9px] font-bold uppercase tracking-wide text-gray-500">{label}</dt>
        <dd className={`text-[13px] font-semibold break-words ${className}`}>{value}</dd>
    </div>
)

const propertyLink = (property) => property ? `/propiedades?p=${property.id}` : null
const tenantLink = (row) => row.active && row.property
    ? propertyLink(row.property)
    : `/inquilinos?v=former&q=${encodeURIComponent(row.tenant.name)}`
const A = ({ to, children, className = '' }) => to
    ? <Link to={to} className={`hover:text-brand-700 hover:underline ${className}`}>{children}</Link>
    : <span className={className}>{children}</span>

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`

export default function Finances() {
    const { properties, tenants, payments, buildings, loading, generateLetter } = useApp()
    const years = useMemo(() => financeYears(payments), [payments])
    const [year, setYear] = useState(new Date().getFullYear())
    const [includeAuto, setIncludeAuto] = useState(true)
    const [query, setQuery] = useState('')
    const [onlyDebt, setOnlyDebt] = useState(false)
    const [sort, setSort] = useState({ key: 'owed', dir: 'desc' })

    const data = useMemo(
        () => computeFinance({ properties, tenants, payments, buildings, year, includeAuto }),
        [properties, tenants, payments, buildings, year, includeAuto]
    )
    const { totals } = data

    const tenantRows = useMemo(() => {
        const q = normalizeText(query)
        const val = {
            name: r => r.tenant.name, building: r => r.building?.name || '', collected: r => r.collected,
            expected: r => r.expected, rate: r => r.rate ?? -1, months: r => r.monthsOwed, owed: r => r.owed
        }[sort.key]
        return data.tenantRows
            .filter(r => !onlyDebt || r.owed > 0)
            .filter(r => !q || normalizeText(`${r.tenant.name} ${r.property?.name || ''} ${r.building?.name || ''}`).includes(q))
            .sort((a, b) => {
                const x = val(a), y = val(b)
                const c = typeof x === 'string' ? x.localeCompare(y, 'es', { numeric: true }) : x - y
                return sort.dir === 'asc' ? c : -c
            })
    }, [data.tenantRows, query, onlyDebt, sort])

    const debtors = useMemo(() => data.tenantRows.filter(r => r.active && r.owed > 0).sort((a, b) => b.owed - a.owed).slice(0, 6), [data.tenantRows])

    const toggleSort = (key) => setSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'name' || key === 'building' ? 'asc' : 'desc' })

    const exportCsv = () => {
        const head = ['Inquilino', 'Propiedad', 'Edificio', 'Activo', `Cobrado ${year}`, `Esperado ${year}`, 'Tasa de cobro %', 'Meses adeudados', 'Monto adeudado']
        const lines = tenantRows.map(r => [r.tenant.name, r.property?.name, r.building?.name || '', r.active ? 'Sí' : 'No', r.collected, r.expected, r.rate ?? '', r.monthsOwed, r.owed])
        const csv = '﻿' + [head, ...lines].map(l => l.map(csvCell).join(',')).join('\n')
        const a = document.createElement('a')
        a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
        a.download = `finanzas-inquilinos-${year}.csv`
        a.click()
        URL.revokeObjectURL(a.href)
    }

    if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" /></div>

    const buildingBars = data.buildingRows.map(b => ({ key: b.id, label: b.building?.name || 'Sin edificio', to: b.building ? `/edificios/${b.id}` : null, value: b.collected, pending: b.owed, color: b.building ? GOLD : '#9ca3af' }))
    const owedBars = data.buildingRows.filter(b => b.owed > 0).sort((a, b) => b.owed - a.owed).map(b => ({ key: b.id, label: b.building?.name || 'Sin edificio', to: b.building ? `/edificios/${b.id}` : null, value: b.owed, color: '#dc2626' }))
    const SortTh = ({ k, children, className = '' }) => (
        <th className={`px-3 py-2 ${className}`}>
            <button onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-brand-700">
                {children}<ArrowUpDown className={`w-3 h-3 ${sort.key === k ? 'text-brand-600' : 'opacity-40'}`} />
            </button>
        </th>
    )

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h1 className="text-xl font-bold">Finanzas</h1>
                    <p className="text-xs text-gray-500">Cobros, pendientes y rendimiento por edificio e inquilino.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer" title="Incluye los meses anteriores que la app marcó como pagados al registrar al inquilino">
                        <input type="checkbox" checked={includeAuto} onChange={(e) => setIncludeAuto(e.target.checked)} className="accent-brand-600" />
                        Incluir historial generado
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                        Año
                        <select value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Año"
                            className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-white font-semibold text-ink">
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </label>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-6 gap-2">
                <Kpi icon={Wallet} label={`Cobrado ${year}`} value={formatCurrency(totals.collected)} tone="brand" />
                <Kpi icon={Target} label="Esperado" value={formatCurrency(totals.expected)} tone="brand" />
                <Kpi icon={Percent} label="Tasa de cobro" value={totals.rate === null ? '—' : `${totals.rate}%`} tone={totals.rate !== null && totals.rate < 80 ? 'amber' : 'green'} />
                <Kpi icon={Clock} label="Pendiente por cobrar" value={formatCurrency(totals.owed)} tone={totals.owed > 0 ? 'red' : 'green'} />
                <Kpi icon={TrendingUp} label="Promedio mensual" value={formatCurrency(totals.avgMonthly)} tone="brand" />
                <Kpi icon={HomeIcon} label="Renta perdida (vacantes)" value={formatCurrency(totals.vacantLoss)} tone={totals.vacantLoss > 0 ? 'amber' : 'green'} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <Card title={`Cobrado por mes · ${year}`} subtitle="Barra sólida: cobrado. Contorno punteado: lo que correspondía cobrar." className="xl:col-span-2">
                    <MonthlyChart data={data.monthly} color={GOLD} />
                </Card>
                <Card title="Estado de las propiedades" subtitle="Según los meses vencidos de cada inquilino.">
                    <Donut
                        centerValue={properties.length} centerLabel="propiedades"
                        segments={[
                            { key: 'paid', label: 'Al día', value: data.statusMix.paid, color: STATUS_COLORS.paid },
                            { key: 'pending', label: 'Pendiente (1 mes)', value: data.statusMix.pending, color: STATUS_COLORS.pending },
                            { key: 'late', label: 'Atrasado (2+ meses)', value: data.statusMix.late, color: STATUS_COLORS.late },
                            { key: 'vacant', label: 'Vacante', value: data.statusMix.vacant, color: STATUS_COLORS.vacant }
                        ]}
                    />
                    <p className="mt-3 text-[11px] text-gray-500">Renta mensual ocupada: <b className="text-ink">{formatCurrency(totals.occupiedRent)}</b> de {formatCurrency(totals.potentialRent)} posibles.</p>
                </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <Card title={`Cobrado por edificio · ${year}`} subtitle="La parte clara es lo que está pendiente hoy.">
                    {buildingBars.length === 0 ? <p className="text-sm text-gray-500">Sin datos.</p> : <HBars rows={buildingBars} valueKey="value" secondaryKey="pending" />}
                </Card>
                <Card title="Pendiente por cobrar por edificio" subtitle="Meses vencidos sin pagar (sin contar el mes en curso).">
                    {owedBars.length === 0 ? <p className="text-sm text-green-700 font-medium">Todo al día, no hay montos pendientes.</p> : <HBars rows={owedBars} valueKey="value" />}
                </Card>
                <Card title="Mayores deudas" subtitle="Inquilinos activos con más monto vencido.">
                    {debtors.length === 0 ? <p className="text-sm text-green-700 font-medium">Nadie tiene deuda vencida.</p> : (
                        <ul className="divide-y divide-gray-100">
                            {debtors.map(r => (
                                <li key={r.tenant.id} className="flex items-center gap-2 py-1.5">
                                    <div className="min-w-0 flex-1">
                                        <A to={propertyLink(r.property)} className="block text-[13px] font-semibold text-ink truncate">{r.tenant.name}</A>
                                        <p className="text-[11px] text-gray-500 truncate">
                                            <A to={propertyLink(r.property)}>{r.property?.name}</A>
                                            {r.building && <> · <A to={`/edificios/${r.building.id}`}>{r.building.name}</A></>} · {r.monthsOwed} mes(es)
                                        </p>
                                    </div>
                                    <span className="text-[13px] font-bold text-red-600 shrink-0">{formatCurrency(r.owed)}</span>
                                    <button onClick={() => generateLetter(r.property, r.tenant)} title="Carta de cobro (PDF)" aria-label={`Carta de cobro ${r.tenant.name}`}
                                        className="p-1.5 rounded hover:bg-brand-50 text-gray-500 hover:text-brand-700"><Mail className="w-4 h-4" /></button>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <Card title="Resumen por edificio" className="xl:col-span-2" subtitle={`Año ${year}`}>
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-[12px]">
                            <thead className="text-[10px] uppercase tracking-wide text-gray-500">
                                <tr className="text-right"><th className="text-left py-1.5">Edificio</th><th>Unid.</th><th>Ocup.</th><th>Cobrado</th><th>Esperado</th><th>Tasa</th><th>Pendiente</th><th>Pend./Atras.</th></tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {data.buildingRows.map(b => (
                                    <tr key={b.id} className="text-right">
                                        <td className="text-left py-1.5 font-semibold">{b.building ? <Link to={`/edificios/${b.id}`} className="hover:text-brand-700">{b.building.name}</Link> : 'Sin edificio'}</td>
                                        <td>{b.units}</td><td>{b.occupied}/{b.units}</td>
                                        <td className="font-semibold">{formatCurrency(b.collected)}</td><td>{formatCurrency(b.expected)}</td>
                                        <td>{b.rate === null ? '—' : `${b.rate}%`}</td>
                                        <td className={b.owed > 0 ? 'font-bold text-red-600' : 'text-gray-400'}>{formatCurrency(b.owed)}</td>
                                        <td><span className="text-yellow-600 font-semibold">{b.pendingCount}</span> / <span className="text-red-600 font-semibold">{b.lateCount}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="text-right font-bold border-t-2 border-gray-200">
                                <tr><td className="text-left py-1.5">Total</td><td>{properties.length}</td><td /><td>{formatCurrency(totals.collected)}</td><td>{formatCurrency(totals.expected)}</td><td>{totals.rate === null ? '—' : `${totals.rate}%`}</td><td className="text-red-600">{formatCurrency(totals.owed)}</td><td>{totals.pendingCount} / {totals.lateCount}</td></tr>
                            </tfoot>
                        </table>
                    </div>
                    <ul className="md:hidden space-y-2">
                        {data.buildingRows.map(b => (
                            <li key={b.id} className="rounded-lg border border-gray-100 p-3">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="font-semibold text-[13px] min-w-0 break-words">
                                        {b.building ? <Link to={`/edificios/${b.id}`} className="hover:text-brand-700">{b.building.name}</Link> : 'Sin edificio'}
                                    </p>
                                    <span className="text-[11px] text-gray-500 shrink-0">{b.units} unid. · {b.occupied}/{b.units} ocup.</span>
                                </div>
                                <dl className="grid grid-cols-3 gap-2 mt-2">
                                    <Stat label="Cobrado" value={formatCurrency(b.collected)} />
                                    <Stat label="Esperado" value={formatCurrency(b.expected)} />
                                    <Stat label="Tasa" value={b.rate === null ? '—' : `${b.rate}%`} />
                                </dl>
                                <div className="flex items-center justify-between gap-2 mt-2 text-xs">
                                    <span className={b.owed > 0 ? 'font-bold text-red-600' : 'text-gray-400'}>Pendiente {formatCurrency(b.owed)}</span>
                                    <span><span className="text-yellow-600 font-semibold">{b.pendingCount}</span> pend. / <span className="text-red-600 font-semibold">{b.lateCount}</span> atras.</span>
                                </div>
                            </li>
                        ))}
                        <li className="rounded-lg bg-brand-50 p-3">
                            <p className="text-xs font-bold mb-1">Total · {properties.length} unidades</p>
                            <dl className="grid grid-cols-3 gap-2">
                                <Stat label="Cobrado" value={formatCurrency(totals.collected)} />
                                <Stat label="Esperado" value={formatCurrency(totals.expected)} />
                                <Stat label="Tasa" value={totals.rate === null ? '—' : `${totals.rate}%`} />
                            </dl>
                            <p className="mt-2 text-xs">
                                <span className="font-bold text-red-600">Pendiente {formatCurrency(totals.owed)}</span>
                                {' · '}{totals.pendingCount} pend. / {totals.lateCount} atras.
                            </p>
                        </li>
                    </ul>
                </Card>
                <Card title="Cobrado por año" subtitle="Histórico de todos los años con pagos.">
                    <YearBars rows={data.yearly} color={GOLD} />
                </Card>
            </div>

            <Card title="Detalle por inquilino" subtitle={`Cobrado y esperado en ${year}; el pendiente es lo vencido hoy.`}>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                    <div className="relative flex-1 min-w-[12rem]">
                        <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar inquilino, propiedad o edificio..." aria-label="Buscar inquilino"
                            className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
                    </div>
                    <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                        <input type="checkbox" checked={onlyDebt} onChange={(e) => setOnlyDebt(e.target.checked)} className="accent-brand-600" /> Solo con deuda
                    </label>
                    <button onClick={exportCsv} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                        <Download className="w-3.5 h-3.5" /> Exportar CSV
                    </button>
                </div>
                <div className="md:hidden flex items-center gap-2 mb-2">
                    <label htmlFor="orden-inquilinos" className="text-xs text-gray-600 shrink-0">Ordenar por</label>
                    <select id="orden-inquilinos" value={sort.key}
                        onChange={(e) => setSort({ key: e.target.value, dir: e.target.value === 'name' || e.target.value === 'building' ? 'asc' : 'desc' })}
                        className="flex-1 min-w-0 px-2 text-sm border border-gray-200 rounded-lg bg-white">
                        <option value="owed">Pendiente</option>
                        <option value="name">Inquilino</option>
                        <option value="building">Propiedad</option>
                        <option value="collected">Cobrado</option>
                        <option value="expected">Esperado</option>
                        <option value="rate">Tasa</option>
                        <option value="months">Meses deb.</option>
                    </select>
                    <button type="button" onClick={() => setSort(s => ({ ...s, dir: s.dir === 'asc' ? 'desc' : 'asc' }))}
                        aria-label={`Orden ${sort.dir === 'asc' ? 'ascendente' : 'descendente'}; tocar para invertir`}
                        className="flex items-center justify-center rounded-lg border border-gray-200 text-gray-600">
                        <ArrowUpDown className="w-4 h-4" />
                    </button>
                </div>
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-[12px]">
                        <thead className="text-[10px] text-gray-500">
                            <tr className="text-right">
                                <SortTh k="name" className="text-left">Inquilino</SortTh>
                                <SortTh k="building" className="text-left">Propiedad</SortTh>
                                <SortTh k="collected">Cobrado</SortTh><SortTh k="expected">Esperado</SortTh><SortTh k="rate">Tasa</SortTh>
                                <SortTh k="months">Meses deb.</SortTh><SortTh k="owed">Pendiente</SortTh>
                                <th className="px-3 py-2 text-left uppercase tracking-wide">Estado</th><th />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {tenantRows.length === 0 && <tr><td colSpan={9} className="p-6 text-center text-gray-500">No hay inquilinos que coincidan.</td></tr>}
                            {tenantRows.map(r => (
                                <tr key={r.tenant.id} className="text-right hover:bg-brand-50/50">
                                    <td className="px-3 py-1.5 text-left font-medium uppercase"><A to={tenantLink(r)}>{r.tenant.name}</A>{!r.active && <span className="ml-1.5 text-[9px] font-bold normal-case bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">Antiguo</span>}</td>
                                    <td className="px-3 py-1.5 text-left"><A to={propertyLink(r.property)}>{r.property?.name}</A>{r.building && <A to={`/edificios/${r.building.id}`} className="block text-[10px] text-gray-500 leading-tight">{r.building.name}</A>}</td>
                                    <td className="px-3 py-1.5 font-semibold">{formatCurrency(r.collected)}</td>
                                    <td className="px-3 py-1.5">{formatCurrency(r.expected)}</td>
                                    <td className="px-3 py-1.5">{r.rate === null ? '—' : `${r.rate}%`}</td>
                                    <td className="px-3 py-1.5">{r.active ? r.monthsOwed : '—'}</td>
                                    <td className={`px-3 py-1.5 ${r.owed > 0 ? 'font-bold text-red-600' : 'text-gray-400'}`}>{r.active ? formatCurrency(r.owed) : '—'}</td>
                                    <td className="px-3 py-1.5 text-left">{r.status && <StatusPill status={r.status} align="left" />}</td>
                                    <td className="px-3 py-1.5">
                                        {r.active && r.monthsOwed > 0 && (
                                            <button onClick={() => generateLetter(r.property, r.tenant)} title="Carta de cobro (PDF)" aria-label={`Carta de cobro ${r.tenant.name}`}
                                                className="p-1.5 rounded hover:bg-brand-50 text-gray-500 hover:text-brand-700"><Mail className="w-4 h-4" /></button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <ul className="md:hidden space-y-2">
                    {tenantRows.length === 0 && <li className="p-6 text-center text-sm text-gray-500">No hay inquilinos que coincidan.</li>}
                    {tenantRows.map(r => (
                        <li key={r.tenant.id} className="rounded-lg border border-gray-100 p-3">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="font-medium uppercase leading-tight break-words">
                                        <A to={tenantLink(r)}>{r.tenant.name}</A>
                                        {!r.active && <span className="ml-1.5 text-[9px] font-bold normal-case bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">Antiguo</span>}
                                    </p>
                                    <p className="text-xs text-gray-500 break-words">
                                        <A to={propertyLink(r.property)}>{r.property?.name}</A>
                                        {r.building && <> · <A to={`/edificios/${r.building.id}`}>{r.building.name}</A></>}
                                    </p>
                                </div>
                                {r.active && r.monthsOwed > 0 && (
                                    <button type="button" onClick={() => generateLetter(r.property, r.tenant)} aria-label={`Carta de cobro ${r.tenant.name}`}
                                        className="flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 shrink-0"><Mail className="w-4 h-4" /></button>
                                )}
                            </div>
                            <dl className="grid grid-cols-3 gap-2 mt-2">
                                <Stat label="Cobrado" value={formatCurrency(r.collected)} />
                                <Stat label="Esperado" value={formatCurrency(r.expected)} />
                                <Stat label="Tasa" value={r.rate === null ? '—' : `${r.rate}%`} />
                            </dl>
                            <div className="flex items-center justify-between gap-2 mt-2 text-xs">
                                <span className={r.owed > 0 ? 'font-bold text-red-600' : 'text-gray-400'}>
                                    {r.active ? `Pendiente ${formatCurrency(r.owed)} · ${r.monthsOwed} mes(es)` : 'Sin pendiente'}
                                </span>
                                {r.status && <StatusPill status={r.status} align="right" />}
                            </div>
                        </li>
                    ))}
                </ul>
            </Card>
        </div>
    )
}

import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { UserPlus, Search, Pencil, FileText, Wallet, UserMinus, Mail, ChevronDown, ChevronRight, History, Phone } from 'lucide-react'
import { differenceInCalendarMonths } from 'date-fns'
import { useApp } from '../contexts/AppContext'
import { formatDate } from '../lib/dateUtils'
import { formatCurrency } from '../lib/calculations'
import { normalizeText, getPaymentStatus, hasMoney, monthKeyOf, formatMonthKey } from '../lib/paymentStatus'
import ConfirmModal from '../components/Common/ConfirmModal'
import StatusPill from '../components/Dashboard/StatusPill'
import RowMenu from '../components/Common/RowMenu'

const METHOD = { transfer: 'Transferencia', cash: 'Efectivo', check: 'Cheque', historical: 'Histórico', pending: 'Pendiente' }

const Spinner = () => <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" /></div>

function TenantCard({ tenant, property, building, status, onPay, onLetter, onReport, onEdit, onUnassign }) {
    const [open, setOpen] = useState(false)
    return (
        <li className="bg-white rounded-xl border border-brand-200 shadow-sm p-3">
            <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                    <p className="font-semibold uppercase leading-tight break-words">{tenant.name}</p>
                    <p className="text-xs text-gray-600 mt-0.5 break-words">
                        {property ? property.name : 'Sin propiedad'}{building && <span className="text-gray-400"> · {building.name}</span>}
                    </p>
                    {tenant.phone && (
                        <a href={`tel:${tenant.phone}`} className="inline-flex items-center gap-1 mt-1 text-xs text-brand-700 underline">
                            <Phone className="w-3 h-3" />{tenant.phone}
                        </a>
                    )}
                </div>
                <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
                    aria-label={open ? 'Ocultar detalles' : 'Ver detalles'} className="-mt-1 -mr-1 flex items-center justify-center text-gray-400">
                    {open ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </button>
            </div>
            <div className="mt-1.5"><StatusPill showDetail align="left" status={status} /></div>
            {open && (
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 mt-3 text-[13px]">
                    <div><dt className="text-[10px] font-bold uppercase text-gray-400">Cédula</dt><dd>{tenant.identity_number || '-'}</dd></div>
                    <div><dt className="text-[10px] font-bold uppercase text-gray-400">Entrada</dt><dd>{formatDate(tenant.start_date)}</dd></div>
                    <div><dt className="text-[10px] font-bold uppercase text-gray-400">Depósito</dt><dd>{tenant.deposit_amount > 0 ? formatCurrency(tenant.deposit_amount) : '-'}</dd></div>
                </dl>
            )}
            <div className="flex items-center gap-2 mt-3">
                {property && (
                    <button type="button" onClick={onPay}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 text-white text-sm font-semibold shadow-sm">
                        <Wallet className="w-4 h-4" /> Registrar pago
                    </button>
                )}
                <RowMenu title={tenant.name} items={[
                    property && status.monthsOwed > 0 && { label: 'Carta de cobro', icon: Mail, onClick: onLetter },
                    property && { label: 'Reporte PDF', icon: FileText, onClick: onReport },
                    { label: 'Editar inquilino', icon: Pencil, onClick: onEdit },
                    { label: 'Desvincular inquilino', icon: UserMinus, danger: true, onClick: onUnassign }
                ]} />
            </div>
        </li>
    )
}

export default function Tenants() {
    const { tenants, properties, buildings, payments, openTenant, openReport, openPayment, generateLetter, closeTenant, onDataChanged, toast, loading } = useApp()
    const [params] = useSearchParams()
    // Deep links (e.g. from Finanzas): /inquilinos?v=former&q=name
    const [query, setQuery] = useState(params.get('q') || '')
    const [view, setView] = useState(params.get('v') === 'former' ? 'former' : 'active') // 'active' | 'former'
    const [toUnassign, setToUnassign] = useState(null)
    const [expanded, setExpanded] = useState(null)

    const { active, former } = useMemo(() => {
        const q = normalizeText(query)
        const enrich = (t) => ({ tenant: t, property: properties.find(p => p.id === t.property_id) })
        const match = ({ tenant, property }) => !q || normalizeText(`${tenant.name} ${tenant.identity_number} ${property?.name || ''}`).includes(q)
        return {
            active: tenants.filter(t => !t.end_date).map(enrich).filter(match).sort((a, b) => a.tenant.name.localeCompare(b.tenant.name)),
            // most recent departures first
            former: tenants.filter(t => !!t.end_date).map(enrich).filter(match).sort((a, b) => b.tenant.end_date.localeCompare(a.tenant.end_date))
        }
    }, [tenants, properties, query])

    // Real payments of a tenant (generated back-fill rows are not "payments they made")
    const paymentsOf = (tenantId) => payments
        .filter(p => p.tenant_id === tenantId && hasMoney(p) && !p.auto_generated)
        .sort((a, b) => monthKeyOf(b).localeCompare(monthKeyOf(a)))

    const totalActive = tenants.filter(t => !t.end_date).length
    const totalFormer = tenants.length - totalActive

    if (loading) return <Spinner />

    const tabClass = (id) => `flex items-center gap-1.5 px-3 py-2 text-[13px] font-semibold border-b-2 -mb-px transition max-md:flex-1 max-md:justify-center ${
        view === id ? 'border-brand-500 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h1 className="text-xl font-bold">Inquilinos</h1>
                <button onClick={() => openTenant()} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-brand-500 to-brand-400 text-white text-xs font-semibold shadow-sm hover:brightness-105 max-md:w-full max-md:justify-center">
                    <UserPlus className="w-3.5 h-3.5" /> Nuevo inquilino
                </button>
            </div>

            <div className="flex gap-1 border-b border-brand-200" role="tablist">
                <button role="tab" aria-selected={view === 'active'} onClick={() => setView('active')} className={tabClass('active')}>
                    Activos <span className="text-[11px] bg-green-50 text-green-700 px-1.5 rounded-full">{totalActive}</span>
                </button>
                <button role="tab" aria-selected={view === 'former'} onClick={() => setView('former')} className={tabClass('former')}>
                    <History className="w-3.5 h-3.5" /> Antiguos <span className="text-[11px] bg-gray-100 text-gray-600 px-1.5 rounded-full">{totalFormer}</span>
                </button>
            </div>

            <div className="bg-white rounded-xl border border-brand-200 shadow-sm p-2.5">
                <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre, cédula o propiedad..."
                        aria-label="Buscar inquilino"
                        className="w-full pl-8 pr-3 py-1.5 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>
            </div>

            {view === 'active' ? (
                <>
                <div className="hidden md:block bg-white rounded-xl border border-brand-200 shadow-sm overflow-x-auto">
                    <table className="w-full text-[13px]">
                        <thead className="bg-brand-50 text-[10px] uppercase tracking-wide text-gray-500">
                            <tr>
                                <th className="text-left px-3 py-2">Inquilino</th>
                                <th className="text-left px-3 py-2 hidden md:table-cell">Cédula</th>
                                <th className="text-left px-3 py-2 hidden sm:table-cell">Teléfono</th>
                                <th className="text-left px-3 py-2">Propiedad</th>
                                <th className="text-left px-3 py-2 hidden lg:table-cell">Entrada</th>
                                <th className="text-left px-3 py-2 hidden xl:table-cell">Depósito</th>
                                <th className="text-left px-3 py-2">Estado de pago</th>
                                <th className="px-3 py-2" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {active.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-gray-500">No hay inquilinos activos.</td></tr>}
                            {active.map(({ tenant, property }) => {
                                const building = buildings.find(b => b.id === property?.building_id)
                                const status = getPaymentStatus(property, tenant, payments)
                                return (
                                    <tr key={tenant.id} className="hover:bg-brand-50/50">
                                        <td className="px-3 py-1.5 font-medium uppercase">{tenant.name}</td>
                                        <td className="px-3 py-1.5 hidden md:table-cell">{tenant.identity_number}</td>
                                        <td className="px-3 py-1.5 hidden sm:table-cell">{tenant.phone}</td>
                                        <td className="px-3 py-1.5">{property?.name}{building && <span className="text-[11px] text-gray-500 block leading-tight">{building.name}</span>}</td>
                                        <td className="px-3 py-1.5 hidden lg:table-cell">{formatDate(tenant.start_date)}</td>
                                        <td className="px-3 py-1.5 hidden xl:table-cell">{tenant.deposit_amount > 0 ? formatCurrency(tenant.deposit_amount) : '-'}</td>
                                        <td className="px-3 py-1.5"><StatusPill showDetail align="left" status={status} /></td>
                                        <td className="px-3 py-1.5">
                                            <div className="flex items-center justify-end gap-0.5">
                                                {property && status.monthsOwed > 0 && (
                                                    <button aria-label="Carta de cobro" title="Carta de cobro (PDF)" onClick={() => generateLetter(property, tenant)} className="p-1.5 rounded hover:bg-brand-50 text-gray-500 hover:text-brand-700"><Mail className="w-4 h-4" /></button>
                                                )}
                                                {property && (
                                                    <button aria-label="Registrar pago" title="Registrar pago" onClick={() => openPayment({ propertyId: property.id })} className="p-1.5 rounded hover:bg-brand-50 text-gray-500 hover:text-brand-700"><Wallet className="w-4 h-4" /></button>
                                                )}
                                                {property && (
                                                    <button aria-label="Reporte PDF" title="Reporte PDF" onClick={() => openReport({ propertyId: property.id, tenantId: tenant.id })} className="p-1.5 rounded hover:bg-brand-50 text-gray-500 hover:text-brand-700"><FileText className="w-4 h-4" /></button>
                                                )}
                                                <button aria-label="Editar inquilino" title="Editar inquilino" onClick={() => openTenant(property, tenant)} className="p-1.5 rounded hover:bg-brand-50 text-gray-500 hover:text-brand-700"><Pencil className="w-4 h-4" /></button>
                                                <button aria-label="Desvincular inquilino" title="Desvincular inquilino" onClick={() => setToUnassign(tenant)} className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600"><UserMinus className="w-4 h-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                <ul className="md:hidden space-y-2">
                    {active.length === 0 && (
                        <li className="bg-white rounded-xl border border-dashed border-brand-200 p-6 text-center text-sm text-gray-500">No hay inquilinos activos.</li>
                    )}
                    {active.map(({ tenant, property }) => {
                        const building = buildings.find(b => b.id === property?.building_id)
                        const status = getPaymentStatus(property, tenant, payments)
                        return (
                            <TenantCard key={tenant.id} tenant={tenant} property={property} building={building} status={status}
                                onPay={() => openPayment({ propertyId: property.id })}
                                onLetter={() => generateLetter(property, tenant)}
                                onReport={() => openReport({ propertyId: property.id, tenantId: tenant.id })}
                                onEdit={() => openTenant(property, tenant)}
                                onUnassign={() => setToUnassign(tenant)} />
                        )
                    })}
                </ul>
                </>
            ) : (
                <div className="space-y-2">
                    <p className="text-xs text-gray-500 flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5" />
                        Histórico de inquilinos anteriores con sus pagos. Al desvincular un inquilino nada se borra: queda aquí.
                    </p>
                    {former.length === 0 && (
                        <div className="bg-white rounded-xl border border-dashed border-brand-200 p-8 text-center text-sm text-gray-500">
                            Aún no hay inquilinos antiguos.
                        </div>
                    )}
                    {former.map(({ tenant, property }) => {
                        const list = paymentsOf(tenant.id)
                        const total = list.reduce((s, p) => s + parseFloat(p.amount_paid || 0), 0)
                        const months = Math.max(1, differenceInCalendarMonths(new Date(`${tenant.end_date}T00:00:00`), new Date(`${tenant.start_date}T00:00:00`)))
                        const open = expanded === tenant.id
                        return (
                            <section key={tenant.id} className="bg-white rounded-xl border border-brand-200 shadow-sm overflow-hidden">
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2.5">
                                    <button onClick={() => setExpanded(open ? null : tenant.id)} aria-expanded={open} aria-label={`Ver pagos de ${tenant.name}`}
                                        className="p-1 rounded hover:bg-gray-100 text-gray-500">
                                        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                    </button>
                                    <div className="min-w-0 flex-1 basis-56">
                                        <p className="font-semibold uppercase leading-tight truncate">{tenant.name}</p>
                                        <p className="text-[11px] text-gray-500 truncate">{tenant.identity_number} · {tenant.phone}</p>
                                    </div>
                                    <div className="basis-40">
                                        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Propiedad</p>
                                        <p className="text-[13px] font-medium">{property?.name || 'Propiedad eliminada'}</p>
                                    </div>
                                    <div className="basis-44">
                                        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Período</p>
                                        <p className="text-[13px]">{formatDate(tenant.start_date)} – {formatDate(tenant.end_date)}</p>
                                        <p className="text-[11px] text-gray-500">≈ {months} {months === 1 ? 'mes' : 'meses'}</p>
                                    </div>
                                    <div className="basis-28 text-right sm:text-left">
                                        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Pagos</p>
                                        <p className="text-[13px] font-semibold text-green-700">{formatCurrency(total)}</p>
                                        <p className="text-[11px] text-gray-500">{list.length} {list.length === 1 ? 'pago' : 'pagos'}</p>
                                    </div>
                                    {property && list.length > 0 && (
                                        <button onClick={() => openReport({ propertyId: property.id, tenantId: tenant.id })}
                                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50">
                                            <FileText className="w-3.5 h-3.5" /> Reporte PDF
                                        </button>
                                    )}
                                </div>
                                {open && (
                                    <div className="border-t border-gray-100 bg-gray-50/60 px-3 py-2">
                                        {list.length === 0 ? (
                                            <p className="text-xs italic text-gray-500 py-1">Este inquilino no tiene pagos registrados.</p>
                                        ) : (
                                            <table className="w-full text-[12px]">
                                                <thead className="text-[10px] uppercase tracking-wide text-gray-400">
                                                    <tr><th className="text-left py-1">Mes</th><th className="text-left py-1">Fecha de pago</th><th className="text-left py-1 hidden sm:table-cell">Método</th><th className="text-right py-1">Monto</th></tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {list.map(p => (
                                                        <tr key={p.id}>
                                                            <td className="py-1 capitalize">{formatMonthKey(monthKeyOf(p))}</td>
                                                            <td className="py-1">{formatDate(p.payment_date)}</td>
                                                            <td className="py-1 hidden sm:table-cell">{METHOD[p.payment_method] || p.payment_method || '-'}</td>
                                                            <td className="py-1 text-right font-semibold">{formatCurrency(p.amount_paid)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                )}
                            </section>
                        )
                    })}
                </div>
            )}

            <ConfirmModal
                isOpen={toUnassign !== null}
                onClose={() => setToUnassign(null)}
                onConfirm={async () => {
                    const { error } = await closeTenant(toUnassign.id, new Date())
                    if (error) { toast.error('Error al desvincular inquilino'); throw new Error(error) }
                    onDataChanged('Inquilino desvinculado. Quedó en "Antiguos" con su historial de pagos.')
                }}
                title="Desvincular inquilino"
                message={`¿Desvincular a ${toUnassign?.name || ''}? Pasa a "Antiguos" y se conserva todo su historial de pagos.`}
                confirmText="Sí, desvincular"
                isDanger
            />
        </div>
    )
}

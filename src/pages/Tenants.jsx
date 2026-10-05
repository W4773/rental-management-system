import { useMemo, useState } from 'react'
import { UserPlus, Search, Pencil, FileText, Wallet, UserMinus } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { formatDate } from '../lib/dateUtils'
import { normalizeText, getPaymentStatus } from '../lib/paymentStatus'
import ConfirmModal from '../components/Common/ConfirmModal'
import StatusPill from '../components/Dashboard/StatusPill'

export default function Tenants() {
    const { tenants, properties, buildings, payments, openTenant, openReport, openPayment, closeTenant, onDataChanged, toast, loading } = useApp()
    const [query, setQuery] = useState('')
    const [onlyActive, setOnlyActive] = useState(true)
    const [toUnassign, setToUnassign] = useState(null)

    const rows = useMemo(() => {
        const q = normalizeText(query)
        return tenants
            .filter(t => (!onlyActive || !t.end_date))
            .map(t => ({ tenant: t, property: properties.find(p => p.id === t.property_id) }))
            .filter(({ tenant, property }) => !q || normalizeText(`${tenant.name} ${tenant.identity_number} ${property?.name || ''}`).includes(q))
            .sort((a, b) => a.tenant.name.localeCompare(b.tenant.name))
    }, [tenants, properties, query, onlyActive])

    if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" /></div>

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h1 className="flex items-center gap-2 text-xl font-bold">
                    Inquilinos
                    <span className="text-xs font-semibold bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">{rows.length}</span>
                </h1>
                <button onClick={() => openTenant()} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 text-white text-xs font-semibold shadow-sm">
                    <UserPlus className="w-3.5 h-3.5" /> Nuevo inquilino
                </button>
            </div>

            <div className="bg-white rounded-xl border border-brand-100 shadow-sm p-2.5 flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre, cédula o propiedad..."
                        aria-label="Buscar inquilino"
                        className="w-full pl-8 pr-3 py-1.5 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>
                {[['Activos', true], ['Todos (con histórico)', false]].map(([label, val]) => (
                    <button key={label} onClick={() => setOnlyActive(val)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border ${onlyActive === val ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-gray-200 text-gray-600'}`}>
                        {label}
                    </button>
                ))}
            </div>

            <div className="bg-white rounded-xl border border-brand-100 shadow-sm overflow-x-auto">
                <table className="w-full text-[13px]">
                    <thead className="bg-brand-50 text-[10px] uppercase tracking-wide text-gray-500">
                        <tr>
                            <th className="text-left px-3 py-2">Inquilino</th>
                            <th className="text-left px-3 py-2 hidden md:table-cell">Cédula</th>
                            <th className="text-left px-3 py-2 hidden sm:table-cell">Teléfono</th>
                            <th className="text-left px-3 py-2">Propiedad</th>
                            <th className="text-left px-3 py-2 hidden lg:table-cell">Entrada</th>
                            <th className="text-left px-3 py-2">Estado</th>
                            <th className="px-3 py-2" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {rows.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-gray-500">No hay inquilinos.</td></tr>}
                        {rows.map(({ tenant, property }) => {
                            const active = !tenant.end_date
                            const building = buildings.find(b => b.id === property?.building_id)
                            return (
                                <tr key={tenant.id} className="hover:bg-gray-50">
                                    <td className="px-3 py-1.5 font-medium uppercase">{tenant.name}</td>
                                    <td className="px-3 py-1.5 hidden md:table-cell">{tenant.identity_number}</td>
                                    <td className="px-3 py-1.5 hidden sm:table-cell">{tenant.phone}</td>
                                    <td className="px-3 py-1.5">{property?.name}{building && <span className="text-[11px] text-gray-500 block leading-tight">{building.name}</span>}</td>
                                    <td className="px-3 py-1.5 hidden lg:table-cell">{formatDate(tenant.start_date)}</td>
                                    <td className="px-3 py-1.5">
                                        {active
                                            ? <StatusPill showDetail align="left" status={getPaymentStatus(property, tenant, payments)} />
                                            : <span className="px-1.5 py-px rounded-full text-[10px] font-bold uppercase border bg-gray-100 text-gray-500 border-gray-200">Histórico</span>}
                                    </td>
                                    <td className="px-3 py-1.5">
                                        <div className="flex items-center justify-end gap-0.5">
                                            {active && property && (
                                                <button aria-label="Registrar pago" title="Registrar pago" onClick={() => openPayment({ propertyId: property.id })} className="p-1.5 rounded hover:bg-brand-50 text-gray-500 hover:text-brand-700"><Wallet className="w-4 h-4" /></button>
                                            )}
                                            {property && (
                                                <button aria-label="Reporte PDF" title="Reporte PDF" onClick={() => openReport({ propertyId: property.id })} className="p-1.5 rounded hover:bg-brand-50 text-gray-500 hover:text-brand-700"><FileText className="w-4 h-4" /></button>
                                            )}
                                            <button aria-label="Editar inquilino" title="Editar inquilino" onClick={() => openTenant(property, tenant)} className="p-1.5 rounded hover:bg-brand-50 text-gray-500 hover:text-brand-700"><Pencil className="w-4 h-4" /></button>
                                            {active && (
                                                <button aria-label="Desasignar inquilino" title="Desasignar inquilino" onClick={() => setToUnassign(tenant)} className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600"><UserMinus className="w-4 h-4" /></button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            <ConfirmModal
                isOpen={toUnassign !== null}
                onClose={() => setToUnassign(null)}
                onConfirm={async () => {
                    const { error } = await closeTenant(toUnassign.id, new Date())
                    if (error) { toast.error('Error al desasignar inquilino'); throw new Error(error) }
                    onDataChanged('Inquilino desasignado')
                }}
                title="Desasignar inquilino"
                message={`¿Desasignar a ${toUnassign?.name || ''}? Su historial de pagos se conserva.`}
                confirmText="Sí, desasignar"
                isDanger
            />
        </div>
    )
}

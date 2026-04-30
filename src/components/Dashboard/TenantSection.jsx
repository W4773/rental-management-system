import { useState } from 'react'

export default function TenantSection({ tenants, properties, onNewTenant, onUnassignTenant, onEditTenant }) {
    const [confirmingId, setConfirmingId] = useState(null)

    const activeTenants = tenants.filter(t => t.end_date === null)

    const getProperty = (propertyId) => properties.find(p => p.id === propertyId)

    const handleUnassign = async (tenantId) => {
        await onUnassignTenant(tenantId)
        setConfirmingId(null)
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-white">Inquilinos Activos</h2>
                    <span className="bg-slate-700 text-white text-xs px-2 py-1 rounded-full">{activeTenants.length}</span>
                </div>
                <button
                    onClick={onNewTenant}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                    <span>+</span> Nuevo Inquilino
                </button>
            </div>

            {activeTenants.length === 0 ? (
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center">
                    <p className="text-4xl mb-3">👤</p>
                    <p className="text-slate-400 font-medium">No hay inquilinos activos</p>
                    <p className="text-slate-500 text-sm mt-1">Haz clic en "Nuevo Inquilino" para asignar uno.</p>
                </div>
            ) : (
                <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-700 text-left">
                                    <th className="px-4 py-3 text-slate-400 font-semibold uppercase text-xs tracking-wider">Propiedad</th>
                                    <th className="px-4 py-3 text-slate-400 font-semibold uppercase text-xs tracking-wider">Inquilino</th>
                                    <th className="px-4 py-3 text-slate-400 font-semibold uppercase text-xs tracking-wider">Cédula</th>
                                    <th className="px-4 py-3 text-slate-400 font-semibold uppercase text-xs tracking-wider">Teléfono</th>
                                    <th className="px-4 py-3 text-slate-400 font-semibold uppercase text-xs tracking-wider">Email</th>
                                    <th className="px-4 py-3 text-slate-400 font-semibold uppercase text-xs tracking-wider">Ingreso</th>
                                    <th className="px-4 py-3 text-slate-400 font-semibold uppercase text-xs tracking-wider text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeTenants.map((tenant, idx) => {
                                    const prop = getProperty(tenant.property_id)
                                    const isConfirming = confirmingId === tenant.id

                                    return (
                                        <tr
                                            key={tenant.id}
                                            className={`border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors ${idx === activeTenants.length - 1 ? 'border-b-0' : ''}`}
                                        >
                                            <td className="px-4 py-3">
                                                <span className="text-white font-medium">{prop?.name || '—'}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-slate-200">{tenant.name}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-slate-400 font-mono text-xs">{tenant.identity_number}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-slate-400">{tenant.phone}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-slate-400">{tenant.email || '—'}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-slate-400">
                                                    {tenant.start_date
                                                        ? new Date(tenant.start_date + 'T00:00:00').toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' })
                                                        : '—'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {isConfirming ? (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <span className="text-slate-400 text-xs">¿Confirmar?</span>
                                                        <button
                                                            onClick={() => handleUnassign(tenant.id)}
                                                            className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded transition-colors"
                                                        >
                                                            Sí
                                                        </button>
                                                        <button
                                                            onClick={() => setConfirmingId(null)}
                                                            className="text-xs bg-slate-600 hover:bg-slate-500 text-white px-2 py-1 rounded transition-colors"
                                                        >
                                                            No
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => onEditTenant(tenant)}
                                                            className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                                                        >
                                                            Editar
                                                        </button>
                                                        <span className="text-slate-600">|</span>
                                                        <button
                                                            onClick={() => setConfirmingId(tenant.id)}
                                                            className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors"
                                                        >
                                                            Desasignar
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}

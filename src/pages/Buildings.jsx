import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, Pencil, Trash2, Plus, MapPin, AlertTriangle, ChevronRight } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { formatCurrency } from '../lib/calculations'
import { getBuildingUnits, buildingStats, enrichUnit } from '../lib/buildingStats'
import { useBuildingColors } from '../lib/buildingColors'
import ConfirmModal from '../components/Common/ConfirmModal'

// Traffic light: green = al día, yellow = 1 month owed, red = 2+ months owed, grey = vacant
const DOT = { paid: 'bg-green-500 ring-green-200', pending: 'bg-yellow-400 ring-yellow-200', late: 'bg-red-500 ring-red-200', vacant: 'bg-gray-300 ring-gray-200' }
const LEGEND = [['paid', 'Al día'], ['pending', 'Pendiente (1 mes)'], ['late', 'Atrasado (2+ meses)'], ['vacant', 'Vacante']]

function Unit({ property, tenant, status, color }) {
    return (
        <Link
            to={`/propiedades?p=${property.id}`}
            title={`${tenant ? tenant.name : 'Sin inquilino'} · ${status.detail}`}
            style={color ? { borderColor: color.border, background: color.soft } : undefined}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-gray-200 bg-white text-[12px] hover:brightness-95 transition"
        >
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ring-2 ${DOT[status.key]}`} />
            <span className="min-w-0 leading-tight">
                <span className="block font-medium truncate max-w-[11rem]">{property.name}</span>
                <span className={`block text-[10px] truncate max-w-[11rem] uppercase ${tenant ? 'text-gray-600' : 'text-gray-400 italic normal-case'}`}>{tenant ? tenant.name : 'Vacante'}</span>
            </span>
        </Link>
    )
}

export default function Buildings() {
    const {
        buildings, properties, tenants, payments, loading, buildingsAvailable,
        openBuilding, deleteBuilding, updateProperty, refreshAll, toast
    } = useApp()
    const [toDelete, setToDelete] = useState(null)
    const colors = useBuildingColors(buildings)

    const rows = useMemo(() => {
        const withBuilding = buildings.map(building => {
            const units = getBuildingUnits(building, properties, tenants, payments)
            return { building, units, ...buildingStats(units) }
        })
        const loose = properties.filter(p => !buildings.some(b => b.id === p.building_id)).map(p => enrichUnit(p, tenants, payments))
        return { withBuilding, loose }
    }, [buildings, properties, tenants, payments])

    const handleDelete = async () => {
        const { error } = await deleteBuilding(toDelete.id)
        if (error) { toast.error('Error al eliminar edificio: ' + error); throw new Error(error) }
        toast.success('Edificio eliminado. Sus propiedades quedaron sin edificio.')
        refreshAll()
    }

    const assign = async (property, buildingId) => {
        if (!buildingId) return
        const building = buildings.find(b => b.id === buildingId)
        const { error } = await updateProperty(property.id, {
            building_id: buildingId,
            ...(building?.address && !property.address ? { address: building.address } : {})
        })
        if (error) return toast.error('No se pudo asignar: ' + error)
        toast.success(`${property.name} asignada a ${building.name}`)
        refreshAll()
    }

    if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" /></div>

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h1 className="flex items-center gap-2 text-xl font-bold">
                    Edificios
                    <span className="text-xs font-semibold bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">{buildings.length}</span>
                </h1>
                <button onClick={() => openBuilding()} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-brand-500 to-brand-400 text-white text-xs font-semibold shadow-sm hover:brightness-105">
                    <Plus className="w-3.5 h-3.5" /> Nuevo edificio
                </button>
            </div>

            <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-600" aria-label="Leyenda de estados">
                {LEGEND.map(([key, label]) => (
                    <li key={key} className="flex items-center gap-1.5"><span className={`w-2.5 h-2.5 rounded-full ring-2 ${DOT[key]}`} />{label}</li>
                ))}
            </ul>

            {!buildingsAvailable && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>Falta activar los edificios: ejecuta <code className="font-mono text-xs">supabase/migrations/002_buildings.sql</code> en el SQL Editor de Supabase (proyecto del alquiler) y recarga.</span>
                </div>
            )}

            {buildingsAvailable && buildings.length === 0 && (
                <div className="bg-white rounded-xl border border-dashed border-brand-200 p-8 text-center">
                    <Building2 className="w-8 h-8 mx-auto text-brand-400 mb-2" />
                    <p className="text-sm text-gray-600 mb-3">Aún no hay edificios. Crea uno y asígnale propiedades.</p>
                    <button onClick={() => openBuilding()} className="px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-semibold">+ Nuevo edificio</button>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                {rows.withBuilding.map(({ building, units, total, occupied, rent, pending, late }) => (
                    <section key={building.id} className="bg-white rounded-xl border border-brand-200 shadow-sm p-3"
                        style={{ borderColor: colors[building.id].border, borderTop: `4px solid ${colors[building.id].solid}` }}>
                        <div className="flex flex-wrap items-start gap-3">
                            <span className="w-9 h-9 rounded-lg text-white flex items-center justify-center shrink-0" style={{ background: colors[building.id].solid }}>
                                <Building2 className="w-4 h-4" />
                            </span>
                            <Link to={`/edificios/${building.id}`} className="min-w-0 flex-1 basis-40 group" title="Ver detalle del edificio">
                                <h2 className="font-bold leading-tight truncate group-hover:underline" style={{ color: colors[building.id].text }}>{building.name}</h2>
                                <p className="flex items-center gap-1 text-xs text-gray-500 truncate">
                                    <MapPin className="w-3 h-3 shrink-0" />{building.address || 'Sin dirección'}
                                </p>
                            </Link>
                            <div className="flex items-center gap-2 max-md:w-full max-md:justify-end">
                            <Link to={`/edificios/${building.id}`} aria-label={`Ver ${building.name}`} title="Ver detalle"
                                className="flex items-center gap-0.5 px-2 py-1.5 rounded-md border border-brand-200 text-brand-700 text-xs font-semibold hover:bg-brand-50 max-md:min-h-[44px] max-md:justify-center">
                                Ver <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                            <button onClick={() => openBuilding(building)} aria-label={`Editar ${building.name}`} title="Editar edificio"
                                className="p-1.5 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"><Pencil className="w-4 h-4" /></button>
                            <button onClick={() => setToDelete(building)} aria-label={`Eliminar ${building.name}`} title="Eliminar edificio"
                                className="p-1.5 rounded-md border border-red-100 text-red-500 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </div>

                        <dl className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-3 text-center">
                            {[['Unidades', total], ['Ocupadas', `${occupied}/${total}`], ['Renta mensual', formatCurrency(rent)], ['Pendientes', pending], ['Atrasadas', late]].map(([label, value]) => (
                                <div key={label} className="rounded-lg px-1 py-1.5" style={{ background: colors[building.id].soft }}>
                                    <dt className="text-[9px] font-bold uppercase tracking-wide text-gray-500">{label}</dt>
                                    <dd className={`text-[13px] max-md:text-xs font-bold leading-tight ${label === 'Atrasadas' && late > 0 ? 'text-red-600' : label === 'Pendientes' && pending > 0 ? 'text-yellow-600' : 'text-ink'}`}>{value}</dd>
                                </div>
                            ))}
                        </dl>

                        <div className="flex flex-wrap gap-1.5 mt-3">
                            {units.length === 0
                                ? <p className="text-xs text-gray-400 italic">Sin propiedades asignadas todavía.</p>
                                : units.map(u => <Unit key={u.property.id} {...u} color={colors[building.id]} />)}
                        </div>
                    </section>
                ))}
            </div>

            {buildingsAvailable && rows.loose.length > 0 && (
                <section className="bg-white rounded-xl border border-brand-200 shadow-sm p-3">
                    <h2 className="font-bold text-ink mb-1">Sin edificio <span className="text-xs font-normal text-gray-500">({rows.loose.length})</span></h2>
                    <p className="text-xs text-gray-500 mb-2">Asigna cada propiedad a un edificio para agruparlas en las listas.</p>
                    <ul className="divide-y divide-gray-100">
                        {rows.loose.map(({ property, tenant }) => (
                            <li key={property.id} className="flex items-center gap-2 py-1.5">
                                <Link to={`/propiedades?p=${property.id}`} className="flex-1 min-w-0 leading-tight hover:text-brand-700">
                                    <span className="block text-[13px] font-medium truncate">{property.name}</span>
                                    <span className={`block text-[11px] truncate uppercase ${tenant ? 'text-gray-600' : 'text-gray-400 italic normal-case'}`}>{tenant ? tenant.name : 'Vacante'}</span>
                                </Link>
                                <select aria-label={`Asignar ${property.name} a un edificio`} value="" disabled={buildings.length === 0}
                                    onChange={(e) => assign(property, e.target.value)}
                                    className="px-2 py-1 text-xs border border-gray-200 rounded-lg bg-white">
                                    <option value="">Asignar a edificio...</option>
                                    {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <ConfirmModal
                isOpen={toDelete !== null}
                onClose={() => setToDelete(null)}
                onConfirm={handleDelete}
                title="Eliminar edificio"
                message={`¿Eliminar "${toDelete?.name || ''}"? Sus propiedades no se borran: quedarán sin edificio.`}
                confirmText="Sí, eliminar edificio"
                isDanger
            />
        </div>
    )
}

import { useMemo, useState } from 'react'
import Modal from '../Common/Modal'
import Button from '../Common/Button'
import { formatCurrency } from '../../lib/calculations'
import { formatMonthKey } from '../../lib/paymentStatus'
import { computeManualFee, manualFeesOf } from '../../lib/lateFee'

const TYPES = [{ id: 'percent', label: '%' }, { id: 'fixed', label: 'RD$' }]

function TypeToggle({ value, onChange, label }) {
    return (
        <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden shrink-0" role="group" aria-label={label}>
            {TYPES.map(t => (
                <button key={t.id} type="button" onClick={() => onChange(t.id)} aria-pressed={value === t.id}
                    className={`px-2.5 py-1.5 text-xs font-semibold ${value === t.id ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                    {t.label}
                </button>
            ))}
        </div>
    )
}

/**
 * Manual late fee for a collection letter: pick the overdue months, and for each a percentage of what is
 * still owed or a fixed amount. "Aplicar a todas" fills every checked month at once.
 * `data` = { tenant, bills: [{ key, remaining }] }; `onApply(fee)` receives { total, items }.
 */
export default function ManualLateFeeModal({ data, onApply, onClear, onClose }) {
    if (!data) return null
    return <ManualForm key={data.tenant?.id} data={data} onApply={onApply} onClear={onClear} onClose={onClose} />
}

function ManualForm({ data, onApply, onClear, onClose }) {
    const { tenant, bills } = data
    const saved = manualFeesOf(tenant)
    // Start from what is already saved on the tenant (value 0 = month left without fee -> unchecked)
    const [rows, setRows] = useState(() => Object.fromEntries(bills.map(b => {
        const e = saved[b.key]
        const v = parseFloat(e?.value) || 0
        return [b.key, e ? { checked: v > 0, type: e.type === 'fixed' ? 'fixed' : 'percent', value: v > 0 ? String(v) : '' } : { checked: true, type: 'percent', value: '' }]
    })))
    const hasSaved = bills.some(b => saved[b.key])
    const [bulk, setBulk] = useState({ type: 'percent', value: '' })

    const patch = (key, p) => setRows(r => ({ ...r, [key]: { ...r[key], ...p } }))
    const applyBulk = () => setRows(r => Object.fromEntries(Object.entries(r).map(([k, row]) => [k, row.checked ? { ...row, type: bulk.type, value: bulk.value } : row])))
    const allChecked = bills.every(b => rows[b.key].checked)
    const toggleAll = () => setRows(r => Object.fromEntries(Object.entries(r).map(([k, row]) => [k, { ...row, checked: !allChecked }])))

    const fee = useMemo(() => {
        const entries = Object.fromEntries(Object.entries(rows).filter(([, r]) => r.checked))
        return computeManualFee(bills, entries)
    }, [rows, bills])
    const amountOf = (key) => fee.items.find(i => i.key === key)?.amount || 0
    const rowInvalid = (row) => row.type === 'percent' && (parseFloat(row.value) || 0) > 100

    const invalid = Object.values(rows).some(r => r.checked && rowInvalid(r))
    const canApply = fee.total > 0 && !invalid
    const bulkValue = parseFloat(bulk.value) || 0
    const bulkInvalid = bulk.type === 'percent' && bulkValue > 100

    return (
        <Modal isOpen onClose={onClose} title="Agregar mora manualmente" size="md">
            <div className="space-y-4 py-1">
                <p className="text-sm text-gray-600">
                    Elige los meses de <strong>{tenant?.name}</strong> y, para cada uno, un porcentaje de lo pendiente o un monto fijo.
                </p>

                <div className="rounded-lg border border-brand-200 bg-brand-50 p-3 space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-brand-800">Aplicar a todas las marcadas</span>
                    <div className="flex flex-wrap items-center gap-2">
                        <TypeToggle value={bulk.type} onChange={(type) => setBulk(b => ({ ...b, type }))} label="Tipo de mora para todas" />
                        <input aria-label="Valor de mora para todas" type="number" min="0" max={bulk.type === 'percent' ? 100 : undefined} step="0.01" inputMode="decimal"
                            className="accessible-input !w-28" placeholder={bulk.type === 'percent' ? '5' : '500'} value={bulk.value}
                            onChange={(e) => setBulk(b => ({ ...b, value: e.target.value }))} />
                        <Button type="button" size="sm" variant="secondary" onClick={applyBulk} disabled={bulkValue <= 0 || bulkInvalid}>Aplicar</Button>
                    </div>
                    {bulkInvalid && <p className="text-xs text-red-600">El porcentaje no puede pasar de 100.</p>}
                </div>

                <div>
                    <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 mb-1 cursor-pointer">
                        <input type="checkbox" checked={allChecked} onChange={toggleAll} className="w-4 h-4 accent-brand-600" /> Marcar todas
                    </label>
                    <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
                        {bills.map(b => {
                            const row = rows[b.key]
                            return (
                                <li key={b.key} className={`p-2.5 flex flex-wrap items-center gap-x-3 gap-y-2 ${row.checked ? '' : 'opacity-50'}`}>
                                    <label className="flex items-center gap-2 min-w-[8.5rem] flex-1 cursor-pointer">
                                        <input type="checkbox" checked={row.checked} onChange={(e) => patch(b.key, { checked: e.target.checked })} className="w-4 h-4 accent-brand-600" />
                                        <span>
                                            <span className="block text-sm font-medium capitalize">{formatMonthKey(b.key)}</span>
                                            <span className="block text-[11px] text-gray-500">Pendiente {formatCurrency(b.remaining)}</span>
                                        </span>
                                    </label>
                                    <TypeToggle value={row.type} onChange={(type) => patch(b.key, { type })} label={`Tipo de mora de ${formatMonthKey(b.key)}`} />
                                    <input aria-label={`Valor de mora de ${formatMonthKey(b.key)}`} type="number" min="0" max={row.type === 'percent' ? 100 : undefined} step="0.01" inputMode="decimal"
                                        disabled={!row.checked} className={`accessible-input !w-24 ${row.checked && rowInvalid(row) ? '!border-red-500' : ''}`}
                                        value={row.value} onChange={(e) => patch(b.key, { value: e.target.value })} />
                                    <span className="w-24 text-right text-sm font-semibold">{row.checked ? formatCurrency(amountOf(b.key)) : '-'}</span>
                                </li>
                            )
                        })}
                    </ul>
                    {invalid && <p className="text-xs text-red-600 mt-1">Hay un porcentaje mayor que 100.</p>}
                </div>

                <p className="flex justify-between text-sm font-semibold border-t border-gray-200 pt-2">
                    <span>Total de mora</span><span>{formatCurrency(fee.total)}</span>
                </p>
                <p className="text-xs text-gray-500">Se guarda en el inquilino: las próximas cartas y la etiqueta MORA la usan. Un mes sin marcar queda sin mora.</p>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-3">
                <Button variant="secondary" size="sm" onClick={onClose}>Cancelar</Button>
                {hasSaved && <Button variant="secondary" size="sm" onClick={onClear}>Quitar mora manual</Button>}
                <Button size="sm" onClick={() => onApply(fee, rows)} disabled={!canApply}>Guardar y generar carta</Button>
            </div>
        </Modal>
    )
}

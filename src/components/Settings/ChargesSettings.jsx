import { useEffect, useState } from 'react'
import { useUserSettings } from '../../hooks/useUserSettings'
import Button from '../Common/Button'
import { DEFAULT_LATE_FEE, resolveLateFeeSettings, describeLateFee } from '../../lib/lateFee'

const Choice = ({ active, onClick, children }) => (
    <button type="button" onClick={onClick} aria-pressed={active}
        className={`px-4 py-2 rounded-lg border-2 text-sm font-semibold transition ${active ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600 hover:border-brand-300'}`}>
        {children}
    </button>
)

/** Ajustes -> Cargos. For now it holds one charge: the late fee ("mora"). */
export default function ChargesSettings({ showToast }) {
    const { settings, loading, updateSettings } = useUserSettings()
    const [form, setForm] = useState(DEFAULT_LATE_FEE)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (settings) setForm(resolveLateFeeSettings(settings.late_fee_settings))
    }, [settings])

    const set = (patch) => setForm(prev => ({ ...prev, ...patch }))
    const valueNumber = parseFloat(form.value)
    const invalid = form.enabled && (!(valueNumber > 0) || (form.type === 'percent' && valueNumber > 100))

    const handleSave = async (e) => {
        e.preventDefault()
        if (invalid) {
            showToast(form.type === 'percent' ? 'El porcentaje debe estar entre 0 y 100.' : 'Escribe un monto de mora mayor que cero.', 'error')
            return
        }
        setSaving(true)
        const clean = {
            ...form,
            value: Number.isFinite(valueNumber) ? valueNumber : 0,
            graceDay: Math.min(Math.max(parseInt(form.graceDay, 10) || 1, 1), 31)
        }
        const { error } = await updateSettings({ late_fee_settings: clean })
        setSaving(false)
        if (error) {
            const missing = /late_fee_settings/i.test(error)
            showToast(missing ? 'Falta ejecutar supabase/migrations/014_late_fee_settings.sql en Supabase (esquema rental) para guardar los cargos.' : 'Error al guardar los cargos: ' + error, 'error')
        } else {
            showToast('Cargos guardados', 'success')
        }
    }

    if (loading) return <p className="text-gray-500">Cargando...</p>

    return (
        <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
            <div>
                <h3 className="text-[20px] font-bold text-gray-900 mb-1">Cargos</h3>
                <p className="text-sm text-gray-500">Cargos adicionales que se pueden sumar a lo que debe un inquilino.</p>
            </div>

            <section className="border-2 border-gray-200 rounded-xl p-4 md:p-5 space-y-5">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h4 className="text-[18px] font-bold text-gray-900">Mora</h4>
                        <p className="text-sm text-gray-500">Recargo por pagar después de la fecha límite. No se cobra sola: al generar la carta de cobro se te pregunta si aplicarla.</p>
                    </div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 cursor-pointer shrink-0">
                        <input type="checkbox" checked={form.enabled} onChange={(e) => set({ enabled: e.target.checked })} className="w-5 h-5 accent-brand-600" />
                        Activar
                    </label>
                </div>

                <fieldset disabled={!form.enabled} className="space-y-5 disabled:opacity-50">
                    <div>
                        <span className="accessible-label">Tipo de mora</span>
                        <div className="flex gap-2">
                            <Choice active={form.type === 'fixed'} onClick={() => set({ type: 'fixed' })}>Monto fijo</Choice>
                            <Choice active={form.type === 'percent'} onClick={() => set({ type: 'percent' })}>Porcentaje</Choice>
                        </div>
                    </div>

                    <div>
                        <label className="accessible-label" htmlFor="fee-value">{form.type === 'percent' ? 'Porcentaje sobre lo pendiente del mes (%)' : 'Monto por cada mes atrasado (RD$)'}</label>
                        <input id="fee-value" type="number" min="0" max={form.type === 'percent' ? 100 : undefined} step="0.01" inputMode="decimal"
                            className="accessible-input max-w-[200px]" value={form.value} onChange={(e) => set({ value: e.target.value })} />
                        {form.type === 'percent' && <p className="text-xs text-gray-500 mt-1">Se calcula sobre lo que falta por pagar de ese mes.</p>}
                    </div>

                    <div>
                        <span className="accessible-label">¿Cuándo empieza la mora?</span>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
                            <span>Si no se paga antes del día</span>
                            <input aria-label="Día límite" type="number" min="1" max="31" inputMode="numeric" className="accessible-input !w-20 text-center"
                                value={form.graceDay} onChange={(e) => set({ graceDay: e.target.value })} />
                            <span>del</span>
                            <select aria-label="Mes del día límite" className="accessible-input !w-auto" value={form.graceMonth} onChange={(e) => set({ graceMonth: e.target.value })}>
                                <option value="next">mes siguiente</option>
                                <option value="same">mismo mes</option>
                            </select>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">El mes se cuenta desde el que corresponde el alquiler. Ejemplo: la renta de junio con "día 15 del mes siguiente" tiene mora desde el 16 de julio.</p>
                    </div>

                    {form.enabled && !invalid && (
                        <p className="text-sm rounded-lg bg-brand-50 border border-brand-200 text-brand-800 px-3 py-2">
                            <strong>Resumen:</strong> {describeLateFee(form)}. Se cobra una sola vez por mes, sin acumularse.
                        </p>
                    )}
                </fieldset>
            </section>

            <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar cargos'}</Button>
        </form>
    )
}

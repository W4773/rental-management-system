import { useEffect, useMemo, useRef, useState } from 'react'
import { FileDown, RotateCcw, AlertTriangle } from 'lucide-react'
import { useUserSettings } from '../../hooks/useUserSettings'
import Button from '../Common/Button'
import {
    LETTER_VARIABLES, LETTER_PRESETS, DEFAULT_LETTER, resolveLetterSettings,
    buildLetterValues, renderTemplate, SAMPLE_LETTER_INPUT, generateCollectionLetter
} from '../../lib/letterTemplate'
import { normalizeText } from '../../lib/paymentStatus'

const Toggle = ({ label, checked, onChange }) => (
    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4 accent-brand-600" />
        {label}
    </label>
)

export default function LetterSettings({ showToast }) {
    const { settings, loading, updateSettings } = useUserSettings()
    const [form, setForm] = useState(DEFAULT_LETTER)
    const [saving, setSaving] = useState(false)
    const bodyRef = useRef(null)

    useEffect(() => {
        if (settings) setForm(resolveLetterSettings(settings.letter_settings))
    }, [settings])

    const sample = useMemo(() => SAMPLE_LETTER_INPUT(), [])
    const values = useMemo(() => buildLetterValues({ ...sample, settings: settings || {} }), [sample, settings])
    const set = (patch) => setForm(prev => ({ ...prev, ...patch }))

    const unknown = useMemo(() => {
        const known = new Set(LETTER_VARIABLES.map(([n]) => normalizeText(n)))
        const found = [...`${form.subject}\n${form.body}`.matchAll(/<<\s*([^<>]+?)\s*>>/g)].map(m => m[1])
        return [...new Set(found.filter(n => !known.has(normalizeText(n))))]
    }, [form.subject, form.body])

    const insertVariable = (name) => {
        const el = bodyRef.current
        const token = `<<${name}>>`
        if (!el) return set({ body: `${form.body}${token}` })
        const start = el.selectionStart ?? form.body.length
        const end = el.selectionEnd ?? form.body.length
        set({ body: form.body.slice(0, start) + token + form.body.slice(end) })
        requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start + token.length, start + token.length) })
    }

    const applyPreset = (key) => {
        const p = LETTER_PRESETS[key]
        setForm(prev => ({ ...prev, preset: key, subject: p.subject, body: p.body }))
    }

    const handleSave = async (e) => {
        e.preventDefault()
        setSaving(true)
        const { error } = await updateSettings({ letter_settings: form })
        setSaving(false)
        if (error) {
            const missing = /letter_settings/i.test(error)
            showToast(missing ? 'Falta ejecutar supabase/migrations/008_letter_template.sql en Supabase (esquema rental) para guardar la plantilla.' : 'Error al guardar la plantilla: ' + error, 'error')
        } else {
            showToast('Plantilla de carta guardada', 'success')
        }
    }

    const handleTestPdf = async () => {
        const doc = await generateCollectionLetter({ ...sample, payments: [], userSettings: settings || {}, letter: form })
        doc.save('Carta-de-cobro-ejemplo.pdf')
    }

    if (loading) return <p className="text-gray-500">Cargando...</p>

    return (
        <form onSubmit={handleSave} className="space-y-6">
            <div>
                <h3 className="text-[20px] font-bold text-gray-900 mb-1">Carta de cobro</h3>
                <p className="text-sm text-gray-500">Plantilla para solicitar al inquilino los meses pendientes. Escribe el texto y usa variables como <code className="bg-gray-100 px-1 rounded">&lt;&lt;Nombre del inquilino&gt;&gt;</code>: se reemplazan solas con los datos de cada inquilino. Genérala desde el detalle de la propiedad, Inquilinos o Finanzas.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div>
                        <label className="accessible-label">Diseño base</label>
                        <div className="flex gap-2">
                            {Object.entries(LETTER_PRESETS).map(([key, p]) => (
                                <button key={key} type="button" onClick={() => applyPreset(key)} aria-pressed={form.preset === key}
                                    className={`px-4 py-2 rounded-lg border-2 text-sm font-semibold transition ${form.preset === key ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600 hover:border-brand-300'}`}>
                                    {p.label}
                                </button>
                            ))}
                            <button type="button" onClick={() => setForm(DEFAULT_LETTER)} className="ml-auto flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50">
                                <RotateCcw className="w-3.5 h-3.5" /> Restaurar
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Elegir un diseño reemplaza el asunto y el texto actuales.</p>
                    </div>

                    <div>
                        <label className="accessible-label" htmlFor="letter-subject">Asunto</label>
                        <input id="letter-subject" className="accessible-input" value={form.subject} onChange={(e) => set({ subject: e.target.value })} maxLength={150} />
                    </div>

                    <div>
                        <label className="accessible-label" htmlFor="letter-body">Texto de la carta</label>
                        <textarea id="letter-body" ref={bodyRef} rows={14} value={form.body} onChange={(e) => set({ body: e.target.value })}
                            className="accessible-input font-mono text-[14px] leading-relaxed" />
                        <p className="text-xs text-gray-500 mt-1 mb-2">Haz clic en una variable para insertarla donde está el cursor:</p>
                        <div className="flex flex-wrap gap-1.5">
                            {LETTER_VARIABLES.map(([name, desc]) => (
                                <button key={name} type="button" title={desc} onClick={() => insertVariable(name)}
                                    className="px-2 py-1 rounded-md bg-brand-50 border border-brand-200 text-xs font-medium text-brand-700 hover:bg-brand-100">
                                    {`<<${name}>>`}
                                </button>
                            ))}
                        </div>
                        {unknown.length > 0 && (
                            <div className="mt-2 flex items-start gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                <span>Variable no reconocida (se imprimirá tal cual): {unknown.map(n => `<<${n}>>`).join(', ')}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                        <Toggle label="Membrete con el nombre del negocio" checked={form.letterhead} onChange={(v) => set({ letterhead: v })} />
                        <Toggle label="Tabla de meses adeudados" checked={form.showTable} onChange={(v) => set({ showTable: v })} />
                        <Toggle label="Firma" checked={form.showSignature} onChange={(v) => set({ showSignature: v })} />
                    </div>
                </div>

                <div>
                    <p className="accessible-label">Vista previa (con datos de ejemplo)</p>
                    <div className="bg-white border border-gray-300 shadow-md rounded-sm overflow-hidden text-[12px] leading-relaxed text-gray-800" data-testid="letter-preview">
                        {form.letterhead && (
                            <div className="px-6 py-3 text-white" style={{ background: '#9a7d24' }}>
                                <p className="font-bold text-base">{values['Empresa']}</p>
                                <p className="text-[11px] opacity-90">{[settings?.phone, settings?.email].filter(Boolean).join('  ·  ') || 'Gestión de alquileres'}</p>
                            </div>
                        )}
                        <div className="px-6 py-4 space-y-2">
                            <p className="text-right text-gray-500">{values['Fecha']}</p>
                            <div>
                                <p className="font-bold">{values['Nombre del inquilino']}</p>
                                <p className="text-gray-500">{values['Propiedad']} · {values['Dirección']}</p>
                            </div>
                            <p className="font-bold pt-1" style={{ color: '#9a7d24' }}>Asunto: {renderTemplate(form.subject, values)}</p>
                            <div className="whitespace-pre-line">{renderTemplate(form.body, values)}</div>
                            {form.showTable && (
                                <table className="w-full border border-gray-200 mt-2 text-[11px]">
                                    <thead><tr className="text-white" style={{ background: '#9a7d24' }}><th className="text-left px-2 py-1">Mes</th><th className="text-right px-2">Renta</th><th className="text-right px-2">Pendiente</th></tr></thead>
                                    <tbody>
                                        {['julio 2026', 'agosto 2026', 'septiembre 2026'].map(m => (
                                            <tr key={m} className="border-t border-gray-100"><td className="px-2 py-1 capitalize">{m}</td><td className="text-right px-2">RD$ 16,000.00</td><td className="text-right px-2 font-semibold">RD$ 16,000.00</td></tr>
                                        ))}
                                        <tr className="border-t border-gray-300 font-bold bg-amber-50"><td className="px-2 py-1" colSpan={2}>Total adeudado</td><td className="text-right px-2">{values['Monto adeudado']}</td></tr>
                                    </tbody>
                                </table>
                            )}
                            {form.showSignature && (
                                <div className="pt-6">
                                    <div className="w-40 border-t border-gray-700" />
                                    <p className="font-bold">{values['Nombre del propietario'] || values['Empresa']}</p>
                                    <p className="text-gray-500">{values['Nombre del propietario'] ? values['Empresa'] : 'Administración'}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap gap-3">
                <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar plantilla'}</Button>
                <Button type="button" variant="secondary" onClick={handleTestPdf}><FileDown className="w-4 h-4 inline mr-1" />Descargar PDF de ejemplo</Button>
            </div>
        </form>
    )
}

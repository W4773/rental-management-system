import { useEffect, useState } from 'react'
import { Ban } from 'lucide-react'
import Modal from '../Common/Modal'
import FormInput from '../Common/FormInput'
import Button from '../Common/Button'
import { formatMonthKey } from '../../lib/paymentStatus'

const REASONS = ['Apartamento vacío / desocupado', 'Acuerdo con el propietario', 'Mantenimiento o remodelación', 'Otro']

/** Asks why months are not being charged ("nulo"). Calls onConfirm(reason). */
export default function VoidMonthsModal({ isOpen, months = [], onClose, onConfirm }) {
    const [choice, setChoice] = useState(REASONS[0])
    const [custom, setCustom] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => { if (isOpen) { setChoice(REASONS[0]); setCustom('') } }, [isOpen])

    const sorted = [...months].sort()
    const reason = choice === 'Otro' ? custom.trim() : choice

    const submit = async (e) => {
        e.preventDefault()
        setSaving(true)
        await onConfirm(reason)
        setSaving(false)
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Marcar meses como nulos" size="sm">
            <form onSubmit={submit}>
                <p className="text-sm text-gray-700 mb-3">
                    {sorted.length === 1 ? 'Este mes' : `Estos ${sorted.length} meses`} no se cobró ni se cobrará: dejan de contar como deuda y no entran en la tasa de cobro.
                </p>
                <p className="text-xs text-gray-500 mb-3 capitalize">{sorted.map(k => formatMonthKey(k)).join(' · ')}</p>
                <FormInput label="Motivo" name="reason" type="select" value={choice} onChange={(e) => setChoice(e.target.value)}>
                    {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </FormInput>
                {choice === 'Otro' && (
                    <FormInput label="Detalle (opcional)" name="custom" value={custom} onChange={(e) => setCustom(e.target.value)} maxLength={120} />
                )}
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" size="sm" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" size="sm" disabled={saving} className="inline-flex items-center gap-1.5">
                        <Ban className="w-4 h-4" /> {saving ? 'Guardando...' : 'Marcar como nulo'}
                    </Button>
                </div>
            </form>
        </Modal>
    )
}

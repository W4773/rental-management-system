import { useEffect, useState } from 'react'
import Modal from '../Common/Modal'
import FormInput from '../Common/FormInput'
import Button from '../Common/Button'
import { useApp } from '../../contexts/AppContext'
import { monthKeyOf, hasMoney, formatMonthKey } from '../../lib/paymentStatus'

const todayStr = () => new Date().toISOString().split('T')[0]

/**
 * Edit a registered rent payment (amount, date, method, reference, notes).
 * The balance and the paid / partial status of the month are recalculated against the rent.
 */
export default function EditPaymentModal({ isOpen, payment, property, onClose }) {
    const { payments, updatePayment, onDataChanged, toast } = useApp()
    const [form, setForm] = useState({ amount_paid: '', payment_date: '', payment_method: 'transfer', reference: '', notes: '' })
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!isOpen || !payment) return
        setForm({
            amount_paid: String(payment.amount_paid ?? ''),
            payment_date: payment.payment_date || todayStr(),
            payment_method: payment.payment_method && payment.payment_method !== 'pending' ? payment.payment_method : 'transfer',
            reference: payment.reference || '',
            notes: payment.notes || ''
        })
        setError('')
    }, [isOpen, payment])

    if (!payment) return null

    const key = monthKeyOf(payment)
    const rent = parseFloat(payment.rent_amount || property?.monthly_rent || 0)
    const otherPaid = payments
        .filter(p => p.property_id === payment.property_id && monthKeyOf(p) === key && p.id !== payment.id && hasMoney(p))
        .reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0)
    const maxAmount = Math.max(0, rent - otherPaid)

    const handleChange = (e) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
        setError('')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        const amount = parseFloat(form.amount_paid)
        if (!amount || amount <= 0) return setError('El monto debe ser mayor a 0')
        if (amount > maxAmount + 1) return setError(`El monto excede lo que falta del mes (RD$ ${maxAmount.toLocaleString('en-US')})`)

        const total = otherPaid + amount
        const closing = total >= rent - 1
        setSaving(true)
        const { error: err } = await updatePayment(payment.id, {
            amount_paid: amount,
            remaining_balance: Math.max(0, rent - total),
            payment_status: closing ? 'paid' : 'partial',
            payment_type: closing ? 'full' : 'partial',
            payment_date: form.payment_date,
            payment_method: form.payment_method,
            reference: form.reference,
            notes: form.notes
        })
        setSaving(false)
        if (err) {
            toast.error('No se pudo guardar el pago: ' + err, 6000)
            return setError(err)
        }
        onDataChanged('Pago actualizado')
        onClose()
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Editar pago · ${formatMonthKey(key)}`} size="sm">
            <form onSubmit={handleSubmit}>
                <p className="text-xs text-gray-500 mb-3">
                    {property?.name} · renta RD$ {rent.toLocaleString('en-US')}
                    {otherPaid > 0 && <> · ya pagado en otros abonos: RD$ {otherPaid.toLocaleString('en-US')}</>}
                </p>
                <div className="grid grid-cols-2 gap-3">
                    <FormInput label="Monto (RD$)" name="amount_paid" type="number" value={form.amount_paid} onChange={handleChange} required min="0" step="0.01" />
                    <FormInput label="Fecha de pago" name="payment_date" type="date" value={form.payment_date} onChange={handleChange} max={todayStr()} required />
                </div>
                <FormInput label="Método" name="payment_method" type="select" value={form.payment_method} onChange={handleChange}>
                    <option value="transfer">Transferencia</option>
                    <option value="cash">Efectivo</option>
                    <option value="check">Cheque</option>
                </FormInput>
                <div className="grid grid-cols-2 gap-3">
                    <FormInput label="Referencia" name="reference" value={form.reference} onChange={handleChange} />
                    <FormInput label="Notas" name="notes" value={form.notes} onChange={handleChange} />
                </div>
                {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" size="sm" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" size="sm" disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</Button>
                </div>
            </form>
        </Modal>
    )
}

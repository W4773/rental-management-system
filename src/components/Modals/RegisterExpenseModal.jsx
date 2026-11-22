import { useState, useEffect } from 'react'
import Modal from '../Common/Modal'
import FormInput from '../Common/FormInput'
import PropertyPicker from '../Common/PropertyPicker'
import Button from '../Common/Button'
import { useUtilityReadings } from '../../hooks/useUtilityReadings'
import { useApp } from '../../contexts/AppContext'
import { EXPENSE_TYPES } from '../../lib/expenseTypes'

const today = () => new Date().toISOString().split('T')[0]

/** Expense by amount (no meter reading). `property` fixes the property; without it a picker is shown. */
export default function RegisterExpenseModal({ isOpen, property, initialType = 'electricity', onClose, onSuccess }) {
    const { properties } = useApp()
    const { addReading } = useUtilityReadings()
    const [form, setForm] = useState({})
    const [errors, setErrors] = useState({})
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!isOpen) return
        setForm({ type: initialType, property_id: property?.id || '', date: today(), amount: '', paid: true, notes: '' })
        setErrors({})
    }, [isOpen, property?.id, initialType])

    const set = (name, value) => { setForm(f => ({ ...f, [name]: value })); setErrors(e => ({ ...e, [name]: null })) }

    const handleSubmit = async (e) => {
        e.preventDefault()
        const amount = parseFloat(form.amount)
        const errs = {}
        if (!form.property_id) errs.property_id = 'Selecciona una propiedad'
        if (!form.date) errs.date = 'La fecha es obligatoria'
        if (!(amount > 0)) errs.amount = 'Ingresa el monto'
        if (Object.keys(errs).length) return setErrors(errs)
        setSaving(true)
        const { error } = await addReading({
            property_id: form.property_id,
            utility_type: form.type,
            reading_date: form.date,
            // No meter: the reading columns are NOT NULL, so they stay at 0
            previous_reading: 0,
            current_reading: 0,
            consumption_volume: 0,
            price_per_unit: amount,
            total_cost: amount,
            paid: form.paid,
            payment_date: form.paid ? form.date : null,
            notes: form.notes.trim() || null
        })
        setSaving(false)
        if (error) return setErrors({ submit: error })
        onSuccess?.()
        onClose()
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Registrar gasto" size="md">
            <form onSubmit={handleSubmit}>
                {property
                    ? <p className="mb-3 text-sm text-gray-600">Propiedad: <span className="font-semibold">{property.name}</span></p>
                    : <PropertyPicker properties={properties || []} value={form.property_id} onChange={(id) => set('property_id', id)} error={errors.property_id} required />}

                <p className="block text-sm font-medium text-gray-700 mb-1">Tipo de gasto</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mb-3" role="radiogroup" aria-label="Tipo de gasto">
                    {EXPENSE_TYPES.map(({ id, label, icon: Icon }) => (
                        <button key={id} type="button" role="radio" aria-checked={form.type === id} onClick={() => set('type', id)}
                            className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border text-sm font-medium transition ${form.type === id
                                ? 'bg-brand-500 border-brand-500 text-white'
                                : 'bg-white border-gray-200 text-gray-700 hover:bg-brand-50'}`}>
                            <Icon className="w-4 h-4" />{label}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                    <FormInput label="Fecha" name="date" type="date" value={form.date || ''} max={today()}
                        onChange={(e) => set('date', e.target.value)} error={errors.date} required />
                    <FormInput label="Monto (RD$)" name="amount" type="number" min="0" step="0.01" placeholder="Ej: 1500"
                        value={form.amount || ''} onChange={(e) => set('amount', e.target.value)} error={errors.amount} required />
                </div>
                <FormInput label="Nota (opcional)" name="notes" value={form.notes || ''} placeholder="Ej: factura de noviembre, plomero..."
                    onChange={(e) => set('notes', e.target.value)} />

                <label className="flex items-center gap-2 text-sm text-gray-700 mb-3">
                    <input type="checkbox" checked={!!form.paid} onChange={(e) => set('paid', e.target.checked)} className="accent-brand-600" />
                    Ya está pagado
                </label>

                {errors.submit && <p className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{errors.submit}</p>}

                <div className="flex gap-3 justify-end mt-4 sheet-actions">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
                    <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Registrar gasto'}</Button>
                </div>
            </form>
        </Modal>
    )
}

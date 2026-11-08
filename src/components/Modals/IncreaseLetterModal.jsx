import { useState } from 'react'
import Modal from '../Common/Modal'
import Button from '../Common/Button'
import { formatCurrency } from '../../lib/calculations'
import { nextIncrease } from '../../lib/rentIncrease'

const toInputDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Asks the effective date and amount of a rent increase, then hands them to onSubmit to build the letter. */
export default function IncreaseLetterModal({ data, onClose, onSubmit }) {
    if (!data) return null
    return <Form key={data.property.id} data={data} onClose={onClose} onSubmit={onSubmit} />
}

function Form({ data, onClose, onSubmit }) {
    const { property, tenant } = data
    const planned = nextIncrease(property) // pre-fills with the increase already configured on the property
    const [date, setDate] = useState(planned?.date ? toInputDate(planned.date) : '')
    const [amount, setAmount] = useState(planned ? String(Math.round((planned.newRent - (parseFloat(property.monthly_rent) || 0)) * 100) / 100) : '')
    const [busy, setBusy] = useState(false)

    const value = parseFloat(amount)
    const valid = Boolean(date) && Number.isFinite(value) && value > 0
    const rent = parseFloat(property.monthly_rent) || 0

    const submit = async (e) => {
        e.preventDefault()
        if (!valid || busy) return
        setBusy(true)
        const [y, m, d] = date.split('-').map(Number)
        await onSubmit({ property, tenant, effectiveDate: new Date(y, m - 1, d), amount: value })
        setBusy(false)
    }

    return (
        <Modal isOpen onClose={onClose} title="Carta de notificación de aumento" size="sm">
            <form onSubmit={submit} className="space-y-4">
                <p className="text-sm text-gray-600">Para <span className="font-semibold">{tenant.name}</span> · {property.name}</p>
                <div>
                    <label className="accessible-label" htmlFor="inc-date">Fecha en que entra en vigor</label>
                    <input id="inc-date" type="date" className="accessible-input" value={date} onChange={(e) => setDate(e.target.value)} required autoFocus />
                </div>
                <div>
                    <label className="accessible-label" htmlFor="inc-amount">Monto del aumento mensual (RD$)</label>
                    <input id="inc-amount" type="number" inputMode="decimal" min="0" step="0.01" className="accessible-input" value={amount}
                        onChange={(e) => setAmount(e.target.value)} placeholder="Ej. 1500" required />
                    {valid && (
                        <p className="text-xs text-gray-500 mt-1">La renta pasará de {formatCurrency(rent)} a <span className="font-semibold">{formatCurrency(rent + value)}</span>.</p>
                    )}
                </div>
                <div className="flex justify-end gap-2 pt-1">
                    <Button type="button" variant="secondary" size="sm" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" size="sm" disabled={!valid || busy}>{busy ? 'Generando...' : 'Generar carta'}</Button>
                </div>
            </form>
        </Modal>
    )
}

import { useState, useEffect, useMemo } from 'react'
import Modal from '../Common/Modal'
import FormInput from '../Common/FormInput'
import Button from '../Common/Button'
import { usePayments } from '../../hooks/usePayments'
import { logActivity } from '../../lib/activityLog'
import { monthLabel } from '../../lib/pdfHelpers'
import { monthKeyOf, hasMoney } from '../../lib/paymentStatus'

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const todayStr = () => new Date().toISOString().split('T')[0]
const pad = (n) => String(n + 1).padStart(2, '0')

/**
 * Register a rent payment.
 * `initial` = { propertyId?, months?: ['YYYY-MM', ...] }. With 2+ months the modal pays the
 * remaining balance of every selected month in one go (multi mode).
 * onSuccess receives { payments, property, tenant } so the caller can offer a receipt.
 */
export default function RegisterPaymentModal({ isOpen, onClose, onSuccess, initial, properties, tenants, payments: allPayments }) {
    const { addPayment } = usePayments()
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState({})

    const now = new Date()
    const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth()))
    const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()))
    const [multiMonths, setMultiMonths] = useState([])
    const [formData, setFormData] = useState({
        property_id: '', payment_type: 'full', amount_paid: '', payment_date: todayStr(),
        payment_method: 'transfer', reference: '', notes: ''
    })

    const isMulti = multiMonths.length > 1
    const currentYear = now.getFullYear()
    const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

    useEffect(() => {
        if (!isOpen) return
        const months = initial?.months || []
        setErrors({})
        setMultiMonths(months.length > 1 ? [...months].sort() : [])
        if (months.length === 1) {
            const [y, m] = months[0].split('-').map(Number)
            setSelectedYear(String(y)); setSelectedMonth(String(m - 1))
        } else {
            setSelectedYear(String(currentYear)); setSelectedMonth(String(now.getMonth()))
        }
        setFormData({
            property_id: initial?.propertyId || '', payment_type: 'full', amount_paid: '', payment_date: todayStr(),
            payment_method: 'transfer', reference: '', notes: ''
        })
    }, [isOpen, initial])

    const selectedProperty = properties.find(p => p.id === formData.property_id) || null
    const activeTenant = useMemo(
        () => tenants.find(t => t.property_id === formData.property_id && !t.end_date) || null,
        [tenants, formData.property_id]
    )
    const propertiesWithTenants = properties.filter(p => tenants.some(t => t.property_id === p.id && !t.end_date))

    const rowsForKey = (key) => allPayments
        .filter(p => p.property_id === formData.property_id && hasMoney(p) && monthKeyOf(p) === key)
    const paidForKey = (key) => rowsForKey(key).reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0)
    // The rent agreed for that month (rows keep it); fall back to the property's current rent
    const rentForKey = (key) => parseFloat(rowsForKey(key)[0]?.rent_amount || selectedProperty?.monthly_rent || 0)

    const singleKey = `${selectedYear}-${pad(parseInt(selectedMonth))}`
    const paidSoFar = formData.property_id ? paidForKey(singleKey) : 0
    const remaining = Math.max(0, rentForKey(singleKey) - paidSoFar)
    const monthPaid = !!selectedProperty && remaining <= 1

    const multiRows = multiMonths.map(key => ({ key, rent: rentForKey(key), remaining: Math.max(0, rentForKey(key) - paidForKey(key)) }))
    const multiTotal = multiRows.reduce((s, r) => s + r.remaining, 0)

    // Auto-fill amount with the remaining balance for full payments
    useEffect(() => {
        if (!isMulti && selectedProperty && formData.payment_type === 'full') {
            setFormData(prev => ({ ...prev, amount_paid: String(remaining) }))
        }
    }, [selectedProperty?.id, formData.payment_type, remaining, isMulti])

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }))
    }

    const buildPayment = (key, amountPaid, alreadyPaid, rentAmount) => {
        const closing = alreadyPaid + amountPaid >= rentAmount - 1
        return {
            property_id: formData.property_id,
            tenant_id: activeTenant.id,
            payment_month: `${key}-01`,
            rent_amount: rentAmount,
            amount_paid: amountPaid,
            remaining_balance: Math.max(0, rentAmount - (alreadyPaid + amountPaid)),
            payment_date: formData.payment_date,
            payment_method: formData.payment_method,
            payment_type: closing ? 'full' : 'partial',
            payment_status: closing ? 'paid' : 'partial',
            reference: formData.reference,
            notes: formData.notes
        }
    }

    const validate = () => {
        const e = {}
        if (!formData.property_id) e.property_id = 'Debe seleccionar una propiedad'
        else if (!activeTenant) e.submit = 'La propiedad no tiene inquilino activo.'
        if (isMulti) {
            if (multiTotal <= 0) e.submit = 'Los meses seleccionados ya están pagados.'
        } else {
            const amount = parseFloat(formData.amount_paid)
            if (monthPaid) e.submit = 'Este mes ya está pagado completamente.'
            if (!formData.amount_paid || isNaN(amount) || amount <= 0) e.amount_paid = 'El monto debe ser mayor a 0'
            else if (amount > remaining + 1) e.amount_paid = `El monto excede la deuda restante (${remaining})`
        }
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSubmit = async (ev) => {
        ev.preventDefault()
        if (!validate()) return
        setLoading(true)
        try {
            const toCreate = isMulti
                ? multiRows.filter(r => r.remaining > 0).map(r => buildPayment(r.key, r.remaining, r.rent - r.remaining, r.rent))
                : [buildPayment(singleKey, parseFloat(formData.amount_paid), paidSoFar, rentForKey(singleKey))]

            const created = []
            for (const payment of toCreate) {
                const { data, error } = await addPayment(payment, { silent: true })
                if (error) throw new Error(error)
                created.push(data)
            }
            logActivity({
                action: 'payment.create',
                entityType: 'payment',
                entityId: created[0]?.id,
                meta: {
                    property_id: selectedProperty.id,
                    tenant_id: activeTenant.id,
                    months: toCreate.map(p => p.payment_month.slice(0, 7)),
                    amount: toCreate.reduce((sum, p) => sum + p.amount_paid, 0)
                }
            })
            onSuccess?.({ payments: created, property: selectedProperty, tenant: activeTenant })
            onClose()
        } catch (err) {
            console.error(err)
            setErrors({ submit: 'Error al registrar: ' + (err.message || 'Fallo de red') })
        } finally {
            setLoading(false)
        }
    }

    const fmt = (n) => `RD$ ${n.toLocaleString('en-US')}`

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isMulti ? `Pagar ${multiMonths.length} meses` : 'Registrar Pago'} size="md">
            <form onSubmit={handleSubmit}>
                <FormInput label="Propiedad" name="property_id" type="select" value={formData.property_id}
                    onChange={handleChange} error={errors.property_id} required disabled={!!initial?.propertyId && isMulti}>
                    <option value="">Seleccionar propiedad...</option>
                    {propertiesWithTenants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </FormInput>

                {isMulti ? (
                    <div className="mb-3 rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm">
                        <ul className="divide-y divide-brand-100">
                            {multiRows.map(r => (
                                <li key={r.key} className="flex justify-between py-1">
                                    <span className="capitalize">{monthLabel(`${r.key}-01`)}</span>
                                    <span className="font-medium">{fmt(r.remaining)}</span>
                                </li>
                            ))}
                        </ul>
                        <div className="flex justify-between pt-2 mt-1 border-t border-brand-200 font-semibold">
                            <span>Total a pagar</span><span>{fmt(multiTotal)}</span>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mes a pagar</label>
                                <select className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white"
                                    value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                                    {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
                                <select className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white"
                                    value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                        </div>
                        {selectedProperty && monthPaid && (
                            <p className="mt-2 mb-1 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">Este mes ya está pagado completamente.</p>
                        )}
                        {selectedProperty && !monthPaid && paidSoFar > 0 && (
                            <p className="mt-2 mb-1 p-2 bg-brand-50 border border-brand-200 rounded text-brand-700 text-xs">
                                Ya se pagó {fmt(paidSoFar)}. Restan {fmt(remaining)}.
                            </p>
                        )}
                        <div className="grid grid-cols-2 gap-3 mt-3">
                            <FormInput label="Tipo de pago" name="payment_type" type="select" value={formData.payment_type} onChange={handleChange}>
                                <option value="full">Completo (restante)</option>
                                <option value="partial">Parcial</option>
                            </FormInput>
                            <FormInput label="Monto (RD$)" name="amount_paid" type="number" value={formData.amount_paid}
                                onChange={handleChange} error={errors.amount_paid} required />
                        </div>
                    </>
                )}

                <div className="grid grid-cols-2 gap-3">
                    <FormInput label="Fecha de pago" name="payment_date" type="date" value={formData.payment_date}
                        onChange={handleChange} max={todayStr()} required />
                    <FormInput label="Método" name="payment_method" type="select" value={formData.payment_method} onChange={handleChange}>
                        <option value="transfer">Transferencia</option>
                        <option value="cash">Efectivo</option>
                        <option value="check">Cheque</option>
                    </FormInput>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <FormInput label="Referencia" name="reference" value={formData.reference} onChange={handleChange} />
                    <FormInput label="Notas" name="notes" value={formData.notes} onChange={handleChange} />
                </div>

                {errors.submit && <div className="text-red-600 text-sm mb-3">{errors.submit}</div>}

                <div className="flex justify-end gap-2 mt-2">
                    <Button variant="secondary" size="sm" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" size="sm" disabled={loading || (!isMulti && monthPaid) || !activeTenant}>
                        {loading ? 'Registrando...' : isMulti ? `Pagar ${fmt(multiTotal)}` : 'Registrar Pago'}
                    </Button>
                </div>
            </form>
        </Modal>
    )
}

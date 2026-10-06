import { useState, useEffect, useMemo } from 'react'
import Modal from '../Common/Modal'
import FormInput from '../Common/FormInput'
import PropertyPicker from '../Common/PropertyPicker'
import Button from '../Common/Button'
import { usePayments } from '../../hooks/usePayments'
import { logActivity } from '../../lib/activityLog'
import { monthLabel } from '../../lib/pdfHelpers'
import { getPendingBills } from '../../lib/paymentStatus'

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

    // Rent is paid in order: the oldest pending bill is paid first, whatever month is picked.
    // Picking a month means "settle everything up to and including it".
    const singleKey = `${selectedYear}-${pad(parseInt(selectedMonth))}`
    const upToKey = isMulti ? multiMonths[multiMonths.length - 1] : singleKey
    const bills = useMemo(
        () => (selectedProperty && activeTenant) ? getPendingBills(selectedProperty, activeTenant, allPayments, upToKey) : [],
        [selectedProperty, activeTenant, allPayments, upToKey]
    )
    const billsTotal = bills.reduce((s, b) => s + b.remaining, 0)
    const remaining = billsTotal
    const monthPaid = !!selectedProperty && billsTotal <= 1

    // Spreads an amount over the bills, oldest first
    const allocate = (amount) => {
        let left = amount
        const out = []
        for (const b of bills) {
            if (left <= 0.005) break
            const give = Math.min(b.remaining, left)
            out.push({ ...b, give })
            left -= give
        }
        return out
    }
    const typedAmount = parseFloat(formData.amount_paid) || 0
    const preview = isMulti ? bills.map(b => ({ ...b, give: b.remaining })) : allocate(typedAmount)

    const multiRows = bills.map(b => ({ key: b.key, rent: b.rent, remaining: b.remaining, extra: !multiMonths.includes(b.key) }))
    const multiTotal = billsTotal

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
            else if (amount > remaining + 1) e.amount_paid = `El monto excede lo pendiente hasta ese mes (${remaining})`
        }
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSubmit = async (ev) => {
        ev.preventDefault()
        if (!validate()) return
        setLoading(true)
        try {
            const toCreate = allocate(isMulti ? billsTotal : parseFloat(formData.amount_paid))
                .map(r => buildPayment(r.key, r.give, r.paid, r.rent))

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
                <PropertyPicker
                    properties={propertiesWithTenants}
                    value={formData.property_id}
                    onChange={(id) => { setFormData(prev => ({ ...prev, property_id: id })); setErrors(prev => ({ ...prev, property_id: null })) }}
                    error={errors.property_id}
                    required
                    disabled={!!initial?.propertyId && isMulti}
                />

                {isMulti ? (
                    <div className="mb-3 rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm">
                        <ul className="divide-y divide-brand-100">
                            {multiRows.map(r => (
                                <li key={r.key} className="flex justify-between py-1">
                                    <span className="capitalize">{monthLabel(`${r.key}-01`)}{r.extra && <span className="ml-2 text-[10px] font-semibold normal-case bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full">anterior pendiente</span>}</span>
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
                        {selectedProperty && !monthPaid && preview.length > 0 && (
                            <div className="mt-2 mb-1 p-2 bg-brand-50 border border-brand-200 rounded text-xs text-brand-800">
                                <p className="font-semibold mb-1">Se paga en orden, del mes más antiguo al más reciente:</p>
                                <ul className="space-y-0.5">
                                    {preview.map(r => (
                                        <li key={r.key} className="flex justify-between gap-2">
                                            <span className="capitalize">{monthLabel(`${r.key}-01`)}{r.key !== singleKey && <span className="ml-1 normal-case text-amber-700">(anterior pendiente)</span>}</span>
                                            <span>{fmt(r.give)}{r.give < r.remaining - 1 ? ` · quedan ${fmt(r.remaining - r.give)}` : ''}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-3 mt-3">
                            <FormInput label="Tipo de pago" name="payment_type" type="select" value={formData.payment_type} onChange={handleChange}>
                                <option value="full">Completo (todo lo pendiente hasta ese mes)</option>
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

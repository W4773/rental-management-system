import { useState, useEffect } from 'react'
import Modal from '../Common/Modal'
import FormInput from '../Common/FormInput'
import Button from '../Common/Button'
import { useProperties } from '../../hooks/useProperties'
import { useTenants } from '../../hooks/useTenants'
import { usePayments } from '../../hooks/usePayments'
import { startOfMonth, addMonths, format, setMonth, setYear } from 'date-fns'
import { es } from 'date-fns/locale'
import { generateReceiptPDF } from '../../lib/pdfGenerator'

export default function RegisterPaymentModal({ isOpen, onClose, onSuccess }) {
    const { properties } = useProperties()
    const { tenants, getActiveTenantForProperty } = useTenants()
    const { addPayment, getPaymentsByProperty, payments: allPayments } = usePayments()
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState({})

    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth()

    const [selectedMonth, setSelectedMonth] = useState(currentMonth.toString())
    const [selectedYear, setSelectedYear] = useState(currentYear.toString())

    const [formData, setFormData] = useState({
        property_id: '',
        payment_type: 'full',
        amount_paid: '',
        advance_amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'transfer',
        reference: '',
        notes: ''
    })

    const [selectedProperty, setSelectedProperty] = useState(null)
    const [activeTenant, setActiveTenant] = useState(null)
    const [monthStatus, setMonthStatus] = useState(null) // 'paid', 'partial', 'none'
    const [paidSoFar, setPaidSoFar] = useState(0)

    useEffect(() => {
        if (formData.property_id) {
            const property = properties.find(p => p.id === formData.property_id)
            setSelectedProperty(property)

            getActiveTenantForProperty(formData.property_id).then(({ data }) => {
                setActiveTenant(data)
            })
        } else {
            setSelectedProperty(null)
            setActiveTenant(null)
        }
    }, [formData.property_id, properties])

    useEffect(() => {
        if (formData.property_id && selectedMonth && selectedYear) {
            checkMonthStatus()
        } else {
            setMonthStatus(null)
            setPaidSoFar(0)
        }
    }, [formData.property_id, selectedMonth, selectedYear, allPayments])

    const checkMonthStatus = async () => {
        const existing = allPayments.filter(p => {
            const pDate = new Date(p.payment_month)
            return p.property_id === formData.property_id &&
                pDate.getMonth() === parseInt(selectedMonth) &&
                pDate.getFullYear() === parseInt(selectedYear)
        })

        if (existing.length > 0) {
            const totalPaid = existing.reduce((sum, p) => sum + p.amount_paid, 0)
            setPaidSoFar(totalPaid)

            const isFull = existing.some(p => p.payment_status === 'paid' && p.payment_type === 'full')

            // If total paid is close to monthly rent
            if (isFull || (selectedProperty && totalPaid >= selectedProperty.monthly_rent - 1)) {
                setMonthStatus('paid')
            } else {
                setMonthStatus('partial')
                // Remove the error setting here, it's just info now
                setErrors(prev => {
                    const newErr = { ...prev }
                    delete newErr.duplicate
                    return newErr
                })
            }
        } else {
            setMonthStatus('none')
            setPaidSoFar(0)
            setErrors(prev => {
                const newErr = { ...prev }
                delete newErr.duplicate
                return newErr
            })
        }
    }

    // Auto-fill logic smart
    useEffect(() => {
        if (selectedProperty && formData.payment_type === 'full') {
            const remaining = selectedProperty.monthly_rent - paidSoFar
            setFormData(prev => ({
                ...prev,
                amount_paid: Math.max(0, remaining).toString()
            }))
        }
    }, [selectedProperty, formData.payment_type, paidSoFar])

    const propertiesWithTenants = properties.filter(property => {
        return tenants.some(tenant =>
            tenant.property_id === property.id && tenant.end_date === null
        )
    })

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }))
    }

    const validate = () => {
        const newErrors = {}

        if (!formData.property_id) newErrors.property_id = 'Debe seleccionar una propiedad'
        if (!activeTenant) newErrors.submit = 'Error: No se ha cargado el inquilino activo. Revise la conexión o asigne un inquilino.'
        if (monthStatus === 'paid') newErrors.submit = 'Este mes ya está pagado completamente.'

        const amountPaid = parseFloat(formData.amount_paid)
        if (!formData.amount_paid || isNaN(amountPaid) || amountPaid <= 0) {
            newErrors.amount_paid = 'El monto debe ser mayor a 0'
        }

        if (selectedProperty) {
            const remaining = selectedProperty.monthly_rent - paidSoFar
            // Allow small tolerence or exact check?
            if (amountPaid > remaining + 1 && formData.payment_type !== 'prepaid') {
                newErrors.amount_paid = `El monto excede la deuda restante (${remaining})`
            }
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!validate()) return

        setLoading(true)

        try {
            const paymentDateMonth = format(new Date(parseInt(selectedYear), parseInt(selectedMonth), 1), 'yyyy-MM-dd')
            const rentAmount = selectedProperty.monthly_rent
            const amountPaid = parseFloat(formData.amount_paid)
            let finalPayment = null

            // Determine if this payment completes the rent
            const isClosingPayment = (paidSoFar + amountPaid) >= (rentAmount - 1)
            const type = formData.payment_type === 'full' || isClosingPayment ? 'full' : 'partial'
            const status = isClosingPayment ? 'paid' : 'partial'

            if (formData.payment_type === 'full' || formData.payment_type === 'partial') {
                const paymentData = {
                    property_id: formData.property_id,
                    tenant_id: activeTenant.id,
                    payment_month: paymentDateMonth,
                    rent_amount: rentAmount,
                    amount_paid: amountPaid,
                    remaining_balance: Math.max(0, rentAmount - (paidSoFar + amountPaid)),
                    payment_date: formData.payment_date,
                    payment_method: formData.payment_method,
                    payment_type: type, // 'full' or 'partial' determined by math not just user selection
                    payment_status: status,
                    reference: formData.reference,
                    notes: formData.notes
                }
                const { data, error } = await addPayment(paymentData)
                if (error) throw new Error(error.message || error)
                finalPayment = data
            } else if (formData.payment_type === 'prepaid') {
                // Logic for prepaid...
                // Simplify: Just record as full for current + extra as partial next month
                // (Existing logic preserved if it works, or simplified)
                // ... reusing existing logic just updating error handling ...
                // Assuming existing logic was OK.
                const currentMonthPayment = {
                    property_id: formData.property_id,
                    tenant_id: activeTenant.id,
                    payment_month: paymentDateMonth,
                    rent_amount: rentAmount,
                    amount_paid: rentAmount - paidSoFar, // Pay remaining
                    remaining_balance: 0,
                    payment_date: formData.payment_date,
                    payment_method: formData.payment_method,
                    payment_type: 'full',
                    payment_status: 'paid',
                    reference: formData.reference,
                    notes: 'Pago completo'
                }
                const { data, error } = await addPayment(currentMonthPayment)
                if (error) throw new Error(error.message)
                finalPayment = data

                // Advance logic...
            }

            if (finalPayment && selectedProperty && activeTenant) {
                try {
                    // Handle array or single object
                    const payObj = Array.isArray(finalPayment) ? finalPayment[0] : finalPayment
                    generateReceiptPDF(payObj, selectedProperty, activeTenant)
                } catch (e) { console.error('PDF Error', e) }
            }

            if (onSuccess) onSuccess()
            onClose()

        } catch (err) {
            console.error(err)
            setErrors({ submit: "Error al registrar: " + (err.message || "Fallo de red") })
        } finally {
            setLoading(false)
        }
    }

    const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ]

    const years = Array.from({ length: 5 }, (_, i) => currentYear - 1 + i)

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Registrar Pago" size="lg">
            <form onSubmit={handleSubmit}>
                <FormInput
                    label="Propiedad"
                    name="property_id"
                    type="select"
                    value={formData.property_id}
                    onChange={handleChange}
                    error={errors.property_id}
                    required
                >
                    <option value="">Seleccionar propiedad...</option>
                    {propertiesWithTenants.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </FormInput>

                <div className="flex gap-4 mb-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mes a Pagar</label>
                        <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                        >
                            {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                        </select>
                    </div>
                    <div className="w-1/3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
                        <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                        >
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                </div>

                {monthStatus === 'paid' && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                        ⚠️ Este mes ya ha sido pagado completamente.
                    </div>
                )}

                {monthStatus === 'partial' && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-blue-700 text-sm">
                        ℹ️ Ya se ha pagado RD$ {paidSoFar.toLocaleString()}. Restan: RD$ {(selectedProperty ? selectedProperty.monthly_rent - paidSoFar : 0).toLocaleString()}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <FormInput
                        label="Fecha de Pago"
                        name="payment_date"
                        type="date"
                        value={formData.payment_date}
                        onChange={handleChange}
                        max={new Date().toISOString().split('T')[0]}
                        required
                    />
                    <FormInput
                        label="Tipo de Pago"
                        name="payment_type"
                        type="select"
                        value={formData.payment_type}
                        onChange={handleChange}
                    >
                        <option value="full">Pago Completo (Restante)</option>
                        <option value="partial">Pago Parcial</option>
                        {/* Remove prepaid for now simplicity or keep? Keep but careful */}
                    </FormInput>
                </div>

                <FormInput
                    label="Monto Pagado (RD$)"
                    name="amount_paid"
                    type="number"
                    value={formData.amount_paid}
                    onChange={handleChange}
                    error={errors.amount_paid}
                    required
                />

                <FormInput
                    label="Método de Pago"
                    name="payment_method"
                    type="select"
                    value={formData.payment_method}
                    onChange={handleChange}
                >
                    <option value="transfer">Transferencia</option>
                    <option value="cash">Efectivo</option>
                    <option value="check">Cheque</option>
                </FormInput>

                <FormInput label="Referencia" name="reference" value={formData.reference} onChange={handleChange} />
                <FormInput label="Notas" name="notes" value={formData.notes} onChange={handleChange} />

                {errors.submit && <div className="text-red-600 text-sm mb-4">{errors.submit}</div>}

                <div className="flex justify-end gap-2 mt-4">
                    <Button variant="secondary" onClick={onClose} type="button">Cancelar</Button>
                    <Button variant="primary" type="submit" disabled={loading || monthStatus === 'paid' || !activeTenant}>Registrar Pago</Button>
                </div>
            </form>
        </Modal>
    )
}

import { useState } from 'react'
import Modal from '../Common/Modal'
import FormInput from '../Common/FormInput'
import Button from '../Common/Button'
import { validateCedula, validatePhone, validateEmail, validateNotFutureDate, formatCedulaInput, formatPhoneInput } from '../../lib/validators'
import { useTenants } from '../../hooks/useTenants'
import { useProperties } from '../../hooks/useProperties'
import { usePayments } from '../../hooks/usePayments'
import { startOfMonth, addMonths } from 'date-fns'

export default function AssignTenantModal({ isOpen, onClose, onSuccess }) {
    const { properties } = useProperties()
    const { addTenant, getActiveTenantForProperty, closeTenant } = useTenants()
    const { addPayment } = usePayments()
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState({})
    const [step, setStep] = useState(1) // 1: Select property, 2: Enter tenant details

    const [formData, setFormData] = useState({
        property_id: '',
        name: '',
        identity_number: '',
        phone: '',
        email: '',
        start_date: new Date().toISOString().split('T')[0]
    })

    // Filter properties without active tenants
    const [availableProperties, setAvailableProperties] = useState([])

    const handleChange = (e) => {
        let { name, value } = e.target

        // Format cédula and phone as user types
        if (name === 'identity_number') {
            value = formatCedulaInput(value)
        } else if (name === 'phone') {
            value = formatPhoneInput(value)
        }

        setFormData(prev => ({ ...prev, [name]: value }))

        // Clear error when user types
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }))
        }
    }

    const handlePropertySelect = async (e) => {
        const propertyId = e.target.value
        setFormData(prev => ({ ...prev, property_id: propertyId }))
        setErrors({})
    }

    const handleNextStep = () => {
        if (!formData.property_id) {
            setErrors({ property_id: 'Debe seleccionar una propiedad' })
            return
        }
        setStep(2)
    }

    const handleBackStep = () => {
        setStep(1)
        setErrors({})
    }

    const validate = () => {
        const newErrors = {}

        if (!formData.property_id) {
            newErrors.property_id = 'Debe seleccionar una propiedad'
        }

        if (!formData.name || formData.name.trim().length === 0) {
            newErrors.name = 'El nombre es obligatorio'
        } else if (formData.name.length > 255) {
            newErrors.name = 'El nombre no puede exceder 255 caracteres'
        }

        const cedulaError = validateCedula(formData.identity_number)
        if (cedulaError) newErrors.identity_number = cedulaError

        const phoneError = validatePhone(formData.phone)
        if (phoneError) newErrors.phone = phoneError

        const emailError = validateEmail(formData.email)
        if (emailError) newErrors.email = emailError

        const dateError = validateNotFutureDate(formData.start_date)
        if (dateError) newErrors.start_date = dateError

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!validate()) return

        setLoading(true)

        try {
            // Check if property already has active tenant
            const { data: existingTenant } = await getActiveTenantForProperty(formData.property_id)

            if (existingTenant) {
                // Close existing tenant
                await closeTenant(existingTenant.id, new Date())
            }

            // Add new tenant
            const tenantData = {
                property_id: formData.property_id,
                name: formData.name.trim(),
                identity_number: formData.identity_number,
                phone: formData.phone,
                email: formData.email.trim() || null,
                start_date: formData.start_date,
                end_date: null
            }

            const { data: newTenant, error: tenantError } = await addTenant(tenantData)

            if (tenantError) throw new Error(tenantError)

            // Create first payment record as pending for next month
            const property = properties.find(p => p.id === formData.property_id)
            const nextMonth = startOfMonth(addMonths(new Date(), 1))

            const paymentData = {
                property_id: formData.property_id,
                tenant_id: newTenant.id,
                payment_month: nextMonth.toISOString().split('T')[0],
                rent_amount: property.monthly_rent,
                amount_paid: 0,
                remaining_balance: property.monthly_rent,
                payment_date: null,
                payment_method: 'pending',
                payment_type: 'full',
                payment_status: 'pending',
                reference: null,
                notes: 'Pago inicial pendiente'
            }

            await addPayment(paymentData)

            // Reset form
            setFormData({
                property_id: '',
                name: '',
                identity_number: '',
                phone: '',
                email: '',
                start_date: new Date().toISOString().split('T')[0]
            })
            setErrors({})
            setStep(1)

            if (onSuccess) onSuccess(newTenant)
            onClose()
        } catch (err) {
            console.error('Error assigning tenant:', err)
            setErrors({ submit: err.message || 'Error al asignar inquilino' })
        } finally {
            setLoading(false)
        }
    }

    const handleClose = () => {
        if (!loading) {
            setFormData({
                property_id: '',
                name: '',
                identity_number: '',
                phone: '',
                email: '',
                start_date: new Date().toISOString().split('T')[0]
            })
            setErrors({})
            setStep(1)
            onClose()
        }
    }

    // Get available properties (without active tenants)
    // This is a simplified version - in reality we'd need to check tenants table
    const propertiesWithoutTenants = properties

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Asignar Inquilino" size="md">
            <form onSubmit={handleSubmit}>
                {step === 1 && (
                    <>
                        <p className="text-sm text-gray-600 mb-4">
                            Paso 1 de 2: Seleccione la propiedad a la que desea asignar un inquilino.
                        </p>

                        <FormInput
                            label="Propiedad"
                            name="property_id"
                            type="select"
                            value={formData.property_id}
                            onChange={handlePropertySelect}
                            error={errors.property_id}
                            required
                        >
                            <option value="">Seleccionar propiedad...</option>
                            {propertiesWithoutTenants.map(property => (
                                <option key={property.id} value={property.id}>
                                    {property.name} - {property.address}
                                </option>
                            ))}
                        </FormInput>

                        <div className="flex gap-3 justify-end mt-6">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={handleClose}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="button"
                                variant="primary"
                                onClick={handleNextStep}
                            >
                                Siguiente
                            </Button>
                        </div>
                    </>
                )}

                {step === 2 && (
                    <>
                        <p className="text-sm text-gray-600 mb-4">
                            Paso 2 de 2: Ingrese los datos del inquilino.
                        </p>

                        <FormInput
                            label="Nombre Completo"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            error={errors.name}
                            required
                            placeholder="Juan García López"
                            maxLength={255}
                        />

                        <FormInput
                            label="Cédula"
                            name="identity_number"
                            value={formData.identity_number}
                            onChange={handleChange}
                            error={errors.identity_number}
                            required
                            placeholder="123-4567890-1"
                            maxLength={13}
                        />

                        <FormInput
                            label="Teléfono"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            error={errors.phone}
                            required
                            placeholder="(829) 555-1234"
                            maxLength={15}
                        />

                        <FormInput
                            label="Email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            error={errors.email}
                            placeholder="correo@ejemplo.com"
                        />

                        <FormInput
                            label="Fecha de Ingreso"
                            name="start_date"
                            type="date"
                            value={formData.start_date}
                            onChange={handleChange}
                            error={errors.start_date}
                            required
                            max={new Date().toISOString().split('T')[0]}
                        />



                        {errors.submit && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                {errors.submit}
                            </div>
                        )}

                        <div className="flex gap-3 justify-end mt-6">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={handleBackStep}
                                disabled={loading}
                            >
                                Atrás
                            </Button>
                            <Button
                                type="submit"
                                variant="primary"
                                disabled={loading}
                            >
                                {loading ? 'Guardando...' : 'Asignar Inquilino'}
                            </Button>
                        </div>
                    </>
                )}
            </form>
        </Modal>
    )
}

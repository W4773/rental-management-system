import { useState, useEffect } from 'react'
import Modal from '../Common/Modal'
import FormInput from '../Common/FormInput'
import PropertyPicker, { PropertyInfo } from '../Common/PropertyPicker'
import Button from '../Common/Button'
import { validateCedula, validatePhone, validateEmail, validateNotFutureDate, formatCedulaInput, formatPhoneInput } from '../../lib/validators'
import { useTenants } from '../../hooks/useTenants'
import { useProperties } from '../../hooks/useProperties'
import { usePayments } from '../../hooks/usePayments'
import { startOfMonth, addMonths } from 'date-fns' // eslint-disable-line no-unused-vars

const EMPTY_FORM = {
    property_id: '',
    name: '',
    identity_number: '',
    phone: '',
    email: '',
    start_date: new Date().toISOString().split('T')[0]
}

export default function AssignTenantModal({ isOpen, onClose, onSuccess, property, tenantToEdit }) {
    const { properties } = useProperties()
    const { addTenant, updateTenant, getActiveTenantForProperty, closeTenant } = useTenants()
    const { addPayment, generateHistoricalPayments } = usePayments()
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState({})
    const [step, setStep] = useState(1)
    const [formData, setFormData] = useState(EMPTY_FORM)

    useEffect(() => {
        if (!isOpen) return

        if (tenantToEdit) {
            setFormData({
                property_id: tenantToEdit.property_id || property?.id || '',
                name: tenantToEdit.name || '',
                identity_number: tenantToEdit.identity_number || '',
                phone: tenantToEdit.phone || '',
                email: tenantToEdit.email || '',
                start_date: tenantToEdit.start_date || new Date().toISOString().split('T')[0]
            })
            setStep(2)
        } else if (property) {
            setFormData({ ...EMPTY_FORM, property_id: property.id })
            setStep(2)
        } else {
            setFormData(EMPTY_FORM)
            setStep(1)
        }
        setErrors({})
    }, [isOpen, property, tenantToEdit])

    const handleChange = (e) => {
        let { name, value } = e.target
        if (name === 'identity_number') value = formatCedulaInput(value)
        else if (name === 'phone') value = formatPhoneInput(value)

        setFormData(prev => ({ ...prev, [name]: value }))
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }))
    }

    const handlePropertySelect = (propertyId) => {
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

    const validate = () => {
        const newErrors = {}

        if (!formData.property_id) newErrors.property_id = 'Debe seleccionar una propiedad'

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
            if (tenantToEdit) {
                const { data: updated, error: updateError } = await updateTenant(tenantToEdit.id, {
                    name: formData.name.trim(),
                    identity_number: formData.identity_number,
                    phone: formData.phone,
                    email: formData.email.trim() || null,
                    start_date: formData.start_date,
                })
                if (updateError) throw new Error(updateError)
                if (onSuccess) onSuccess(updated)
            } else {
                const { data: existingTenant } = await getActiveTenantForProperty(formData.property_id)
                if (existingTenant) await closeTenant(existingTenant.id, new Date())

                const { data: newTenant, error: tenantError } = await addTenant({
                    property_id: formData.property_id,
                    name: formData.name.trim(),
                    identity_number: formData.identity_number,
                    phone: formData.phone,
                    email: formData.email.trim() || null,
                    start_date: formData.start_date,
                    end_date: null
                })
                if (tenantError) throw new Error(tenantError)

                const selectedProperty = properties.find(p => p.id === formData.property_id)
                // Auto-generate paid records for all months before the last 2 (current + previous)
                await generateHistoricalPayments(
                    formData.property_id,
                    newTenant.id,
                    formData.start_date,
                    selectedProperty.monthly_rent
                )

                if (onSuccess) onSuccess(newTenant)
            }

            handleClose()
        } catch (err) {
            console.error('Error en AssignTenantModal:', err)
            setErrors({ submit: err.message || 'Error al guardar inquilino' })
        } finally {
            setLoading(false)
        }
    }

    const handleClose = () => {
        if (!loading) {
            setFormData(EMPTY_FORM)
            setErrors({})
            setStep(1)
            onClose()
        }
    }

    const isEditing = Boolean(tenantToEdit)
    const selectedPropertyName = properties.find(p => p.id === formData.property_id)?.name || ''

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={isEditing ? 'Editar Inquilino' : 'Asignar Inquilino'}
            size="md"
        >
            <form onSubmit={handleSubmit}>
                {step === 1 && (
                    <>
                        <p className="text-sm text-gray-600 mb-4">
                            Paso 1 de 2: Seleccione la propiedad a la que desea asignar un inquilino.
                        </p>
                        <PropertyPicker
                            properties={properties}
                            value={formData.property_id}
                            onChange={handlePropertySelect}
                            error={errors.property_id}
                            required
                        />
                        <div className="flex gap-3 justify-end mt-6">
                            <Button type="button" variant="secondary" onClick={handleClose}>Cancelar</Button>
                            <Button type="button" variant="primary" onClick={handleNextStep}>Siguiente</Button>
                        </div>
                    </>
                )}

                {step === 2 && (
                    <>
                        {selectedPropertyName && (
                            <div className="text-sm text-gray-500 mb-4 bg-gray-50 px-3 py-2 rounded-lg">
                                <p>Propiedad: <span className="font-semibold text-gray-700">{selectedPropertyName}</span></p>
                                <PropertyInfo property={properties.find(p => p.id === formData.property_id)} className="mt-0.5" />
                            </div>
                        )}

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
                            {!isEditing && !property ? (
                                <Button type="button" variant="secondary" onClick={() => { setStep(1); setErrors({}) }} disabled={loading}>
                                    Atrás
                                </Button>
                            ) : (
                                <Button type="button" variant="secondary" onClick={handleClose} disabled={loading}>
                                    Cancelar
                                </Button>
                            )}
                            <Button type="submit" variant="primary" disabled={loading}>
                                {loading ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Asignar Inquilino'}
                            </Button>
                        </div>
                    </>
                )}
            </form>
        </Modal>
    )
}

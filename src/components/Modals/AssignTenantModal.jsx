import { useState, useEffect, useMemo } from 'react'
import Modal from '../Common/Modal'
import FormInput from '../Common/FormInput'
import PropertyPicker, { PropertyInfo } from '../Common/PropertyPicker'
import Button from '../Common/Button'
import { validateCedula, validatePhone, validateEmail, validateMoney, validateNotFutureDate, formatCedulaInput, formatPhoneInput } from '../../lib/validators'
import { useTenants } from '../../hooks/useTenants'
import { Building2 } from 'lucide-react'
import { createTenantWithHistory, depositColumnMissing, DEPOSIT_MIGRATION_MESSAGE } from '../../lib/createTenantWithHistory'
import { useApp } from '../../contexts/AppContext'
import { usePayments } from '../../hooks/usePayments'
import { startOfMonth, addMonths } from 'date-fns' // eslint-disable-line no-unused-vars

const EMPTY_FORM = {
    property_id: '',
    name: '',
    identity_number: '',
    phone: '',
    email: '',
    deposit_amount: '',
    start_date: new Date().toISOString().split('T')[0]
}

export default function AssignTenantModal({ isOpen, onClose, onSuccess, property, tenantToEdit }) {
    // Context list is refreshed after every change; a private hook instance went stale and missed new properties
    const { properties, buildings, tenants } = useApp()
    const { addTenant, updateTenant, getActiveTenantForProperty, closeTenant } = useTenants()
    const { addPayment, generateHistoricalPayments } = usePayments()
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState({})
    const [step, setStep] = useState(1)
    const [formData, setFormData] = useState(EMPTY_FORM)
    const [buildingFilter, setBuildingFilter] = useState('')

    // Only properties without an active tenant can receive a new one
    const vacant = useMemo(
        () => properties.filter(p => !tenants.some(t => t.property_id === p.id && !t.end_date)),
        [properties, tenants]
    )
    const vacantBuildings = useMemo(
        () => buildings.filter(b => vacant.some(p => p.building_id === b.id)),
        [buildings, vacant]
    )
    const hasLoose = vacant.some(p => !p.building_id || !buildings.some(b => b.id === p.building_id))

    useEffect(() => {
        if (!isOpen) return

        if (tenantToEdit) {
            setFormData({
                property_id: tenantToEdit.property_id || property?.id || '',
                name: tenantToEdit.name || '',
                identity_number: tenantToEdit.identity_number || '',
                phone: tenantToEdit.phone || '',
                email: tenantToEdit.email || '',
                deposit_amount: tenantToEdit.deposit_amount ?? '',
                start_date: tenantToEdit.start_date || new Date().toISOString().split('T')[0]
            })
            setStep(2)
        } else if (property) {
            setFormData({ ...EMPTY_FORM, property_id: property.id })
            setStep(2)
        } else {
            // A single free property needs no choosing: go straight to the tenant data
            setFormData(vacant.length === 1 ? { ...EMPTY_FORM, property_id: vacant[0].id } : EMPTY_FORM)
            setStep(vacant.length === 1 ? 2 : 1)
        }
        setBuildingFilter('')
        setErrors({})
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

        const depositError = validateMoney(formData.deposit_amount, 'El depósito')
        if (depositError) newErrors.deposit_amount = depositError

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
                    // Always sent on edit so it can be cleared; the column comes with migration 007
                    ...(formData.deposit_amount !== '' || tenantToEdit.deposit_amount != null
                        ? { deposit_amount: formData.deposit_amount === '' ? null : parseFloat(formData.deposit_amount) }
                        : {})
                })
                if (updateError) throw new Error(updateError)
                if (onSuccess) onSuccess(updated)
            } else {
                // Resolve the property BEFORE touching any data, so a failure never leaves a half-created tenant
                const selectedProperty = properties.find(p => p.id === formData.property_id)
                    || (property?.id === formData.property_id ? property : null)
                if (!selectedProperty) {
                    throw new Error('No se encontró la propiedad seleccionada. Recarga la página e inténtalo de nuevo.')
                }

                const { data: existingTenant } = await getActiveTenantForProperty(formData.property_id)
                if (existingTenant) await closeTenant(existingTenant.id, new Date())

                const { data: newTenant, error: tenantError } = await createTenantWithHistory(
                    { addTenant, generateHistoricalPayments },
                    { propertyId: formData.property_id, monthlyRent: selectedProperty.monthly_rent, property: selectedProperty, values: formData }
                )
                if (tenantError) throw new Error(tenantError)

                if (onSuccess) onSuccess(newTenant)
            }

            handleClose()
        } catch (err) {
            console.error('Error en AssignTenantModal:', err)
            setErrors({ submit: depositColumnMissing(err.message) ? DEPOSIT_MIGRATION_MESSAGE : (err.message || 'Error al guardar inquilino') })
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
                        <p className="text-sm text-gray-600 mb-3">
                            Paso 1 de 2: Seleccione la propiedad disponible a la que desea asignar un inquilino.
                            <span className="ml-1 font-semibold text-brand-700">{vacant.length} disponible{vacant.length === 1 ? '' : 's'}</span>
                        </p>
                        {vacant.length === 0 && (
                            <div className="mb-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
                                Todas las propiedades están ocupadas. Desvincula un inquilino o registra una propiedad nueva.
                            </div>
                        )}
                        {(vacantBuildings.length > 1 || (vacantBuildings.length > 0 && hasLoose)) && (
                            <div className="flex flex-wrap gap-1.5 mb-3" role="group" aria-label="Filtrar por edificio">
                                {[{ id: '', name: 'Todos' }, ...vacantBuildings].map(b => (
                                    <button key={b.id || 'all'} type="button" aria-pressed={buildingFilter === b.id}
                                        onClick={() => { setBuildingFilter(b.id); setFormData(prev => ({ ...prev, property_id: '' })) }}
                                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition ${buildingFilter === b.id ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'}`}>
                                        {b.id && <Building2 className="w-3 h-3" />}{b.name}
                                    </button>
                                ))}
                            </div>
                        )}
                        <PropertyPicker
                            properties={vacant}
                            onlyVacant
                            buildingId={buildingFilter || null}
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
                            label="Depósito (RD$) — opcional"
                            name="deposit_amount"
                            type="number"
                            value={formData.deposit_amount}
                            onChange={handleChange}
                            error={errors.deposit_amount}
                            placeholder="Ej: 30000"
                            min="0"
                            step="0.01"
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

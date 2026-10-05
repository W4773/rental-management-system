import { useState, useEffect } from 'react'
import Modal from '../Common/Modal'
import FormInput from '../Common/FormInput'
import Button from '../Common/Button'
import { validatePropertyName, validateMonthlyRent } from '../../lib/validators'
import { useProperties } from '../../hooks/useProperties'

const EMPTY_FORM = {
    name: '',
    address: '',
    monthly_rent: '',
    bedrooms: '',
    bathrooms: '',
    property_type: 'apartamento',
    unit_number: '',
    square_meters: '',
    notes: '',
    contract_start_date: '',
    deposit_amount: '',
    annual_increase_pct: '',
    increase_type: 'percentage',
    building_id: ''
}

export default function RegisterPropertyModal({ isOpen, onClose, onSuccess, propertyToEdit = null, buildings = [], onNewBuilding }) {
    const { addProperty, updateProperty } = useProperties()
    const [errors, setErrors] = useState({})
    const [formData, setFormData] = useState(EMPTY_FORM)
    const [saving, setSaving] = useState(false)
    const selectedBuilding = buildings.find(b => b.id === formData.building_id)



    useEffect(() => {
        if (isOpen && propertyToEdit) {
            setFormData({
                name: propertyToEdit.name || '',
                address: propertyToEdit.address || '',
                monthly_rent: propertyToEdit.monthly_rent || '',
                bedrooms: propertyToEdit.bedrooms || '',
                bathrooms: propertyToEdit.bathrooms || '',
                property_type: propertyToEdit.property_type || 'apartamento',
                unit_number: propertyToEdit.unit_number || '',
                square_meters: propertyToEdit.square_meters || '',
                notes: propertyToEdit.notes || '',
                contract_start_date: propertyToEdit.contract_start_date || '',
                deposit_amount: propertyToEdit.deposit_amount || '',
                annual_increase_pct: propertyToEdit.annual_increase_pct || '',
                increase_type: propertyToEdit.increase_type || 'percentage',
                building_id: propertyToEdit.building_id || ''
            })
        } else if (isOpen) {
            setFormData(EMPTY_FORM)
        }
    }, [isOpen, propertyToEdit])

    const handleChange = (e) => {
        const { name, value } = e.target
        if (name === 'building_id' && value === '__new__') {
            onNewBuilding?.()
            return
        }
        setFormData(prev => ({ ...prev, [name]: value }))
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }))
    }

    const validate = () => {
        const newErrors = {}

        const nameError = validatePropertyName(formData.name)
        if (nameError) newErrors.name = nameError

        if ((!formData.address || formData.address.trim().length === 0) && !selectedBuilding?.address) {
            newErrors.address = 'La dirección es obligatoria (o elija un edificio con dirección)'
        } else if (formData.address.length > 255) {
            newErrors.address = 'La dirección no puede exceder 255 caracteres'
        }

        const rentError = validateMonthlyRent(formData.monthly_rent)
        if (rentError) newErrors.monthly_rent = rentError

        if (formData.notes && formData.notes.length > 500) {
            newErrors.notes = 'Las notas no pueden exceder 500 caracteres'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!validate()) return

        const propertyData = {
            name: formData.name.trim(),
            address: formData.address.trim() || selectedBuilding?.address || '',
            monthly_rent: parseFloat(formData.monthly_rent),
            bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : 1,
            bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : 1,
            property_type: formData.property_type || 'apartamento',
            unit_number: formData.unit_number.trim() || null,
            square_meters: formData.square_meters ? parseFloat(formData.square_meters) : null,
            notes: formData.notes.trim() || null,
            contract_start_date: formData.contract_start_date || null,
            deposit_amount: formData.deposit_amount ? parseFloat(formData.deposit_amount) : null,
            annual_increase_pct: formData.annual_increase_pct ? parseFloat(formData.annual_increase_pct) : null,
            increase_type: formData.increase_type || 'percentage',
        }

        // building_id only travels when relevant, so saving keeps working before migration 002 is applied
        if (formData.building_id) propertyData.building_id = formData.building_id
        else if (propertyToEdit?.building_id) propertyData.building_id = null

        setSaving(true)
        const { error } = propertyToEdit
            ? await updateProperty(propertyToEdit.id, propertyData)
            : await addProperty(propertyData)
        setSaving(false)
        if (error) {
            const duplicate = /duplicate|unique/i.test(error)
            setErrors(duplicate ? { name: 'Ya existe una propiedad con este nombre' } : { submit: error })
            return
        }

        setFormData(EMPTY_FORM)
        setErrors({})
        if (onSuccess) onSuccess()
        onClose()
    }

    const handleClose = () => {
        setFormData(EMPTY_FORM)
        setErrors({})
        onClose()
    }

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title={propertyToEdit ? "Editar Propiedad" : "Registrar Nueva Propiedad"} size="xl">
            <form onSubmit={handleSubmit} className="flex flex-col h-full">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
                    {/* Left Column: Identificación y Detalles Físicos */}
                    <div className="space-y-4">
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b pb-2 mb-3">Identificación</p>
                            <div className="space-y-3">
                                <FormInput
                                    label="Nombre / Código"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    error={errors.name}
                                    required
                                    placeholder="Ej: APT 101"
                                    maxLength={50}
                                />
                                <FormInput
                                    label="Edificio"
                                    name="building_id"
                                    type="select"
                                    value={formData.building_id}
                                    onChange={handleChange}
                                >
                                    <option value="">Sin edificio</option>
                                    {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    {onNewBuilding && <option value="__new__">+ Nuevo edificio...</option>}
                                </FormInput>
                                <FormInput
                                    label={selectedBuilding ? 'Dirección (opcional: usa la del edificio)' : 'Dirección Completa'}
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    error={errors.address}
                                    required={!selectedBuilding?.address}
                                    placeholder={selectedBuilding?.address || 'Ej: Calle Principal #123, Santo Domingo'}
                                    maxLength={255}
                                />
                            </div>
                        </div>

                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b pb-2 mb-3 pt-2">Detalles físicos</p>
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-4">
                                    <FormInput
                                        label="Tipo de propiedad"
                                        name="property_type"
                                        type="select"
                                        value={formData.property_type}
                                        onChange={handleChange}
                                    >
                                        <option value="apartamento">Apartamento</option>
                                        <option value="casa">Casa</option>
                                        <option value="local_comercial">Local comercial</option>
                                        <option value="otro">Otro</option>
                                    </FormInput>
                                    <FormInput
                                        label="Piso / Número de unidad"
                                        name="unit_number"
                                        value={formData.unit_number}
                                        onChange={handleChange}
                                        placeholder="Ej: Piso 3, Apto 3B"
                                        maxLength={50}
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <FormInput
                                        label="Habitaciones"
                                        name="bedrooms"
                                        type="select"
                                        value={formData.bedrooms}
                                        onChange={handleChange}
                                    >
                                        <option value="">—</option>
                                        <option value="1">1</option>
                                        <option value="2">2</option>
                                        <option value="3">3</option>
                                        <option value="4">4</option>
                                        <option value="5">5+</option>
                                    </FormInput>
                                    <FormInput
                                        label="Baños"
                                        name="bathrooms"
                                        type="select"
                                        value={formData.bathrooms}
                                        onChange={handleChange}
                                    >
                                        <option value="">—</option>
                                        <option value="1">1</option>
                                        <option value="2">2</option>
                                        <option value="3">3</option>
                                        <option value="4">4+</option>
                                    </FormInput>
                                    <FormInput
                                        label="Metros cuadrados"
                                        name="square_meters"
                                        type="number"
                                        value={formData.square_meters}
                                        onChange={handleChange}
                                        placeholder="Ej: 75"
                                        min="1"
                                        step="0.5"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Contrato y Notas */}
                    <div className="space-y-4">
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b pb-2 mb-3">Contrato</p>
                            <div className="space-y-3">
                                <FormInput
                                    label="Precio de Alquiler Mensual (RD$)"
                                    name="monthly_rent"
                                    type="number"
                                    value={formData.monthly_rent}
                                    onChange={handleChange}
                                    error={errors.monthly_rent}
                                    required
                                    placeholder="15000"
                                    min="0"
                                    step="0.01"
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <FormInput
                                        label="Fecha inicio contrato"
                                        name="contract_start_date"
                                        type="date"
                                        value={formData.contract_start_date}
                                        onChange={handleChange}
                                    />
                                    <FormInput
                                        label="Depósito (RD$)"
                                        name="deposit_amount"
                                        type="number"
                                        value={formData.deposit_amount}
                                        onChange={handleChange}
                                        placeholder="Ej: 30000"
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                                <div>
                                    <label className="accessible-label mb-1 block">Incremento Anual</label>
                                    {/* Toggle tipo */}
                                    <div className="flex rounded-lg overflow-hidden border-2 border-gray-200 mb-2" style={{ height: '48px' }}>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, increase_type: 'percentage' }))}
                                            className={`flex-1 font-semibold text-[16px] transition ${
                                                formData.increase_type === 'percentage'
                                                    ? 'bg-brand-600 text-white'
                                                    : 'bg-white text-gray-700 hover:bg-gray-50'
                                            }`}
                                        >
                                            % Porcentaje
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, increase_type: 'fixed' }))}
                                            className={`flex-1 font-semibold text-[16px] transition ${
                                                formData.increase_type === 'fixed'
                                                    ? 'bg-brand-600 text-white'
                                                    : 'bg-white text-gray-700 hover:bg-gray-50'
                                            }`}
                                        >
                                            RD$ Monto Fijo
                                        </button>
                                    </div>
                                    {/* Input field */}
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            name="annual_increase_pct"
                                            value={formData.annual_increase_pct}
                                            onChange={handleChange}
                                            placeholder={formData.increase_type === 'percentage' ? 'Ej: 5' : 'Ej: 1000'}
                                            min="0"
                                            step={formData.increase_type === 'percentage' ? '0.1' : '1'}
                                            className="accessible-input flex-1"
                                        />
                                        <span className="text-[18px] font-bold text-gray-600 min-w-[40px]">
                                            {formData.increase_type === 'percentage' ? '%' : 'RD$'}
                                        </span>
                                    </div>
                                    {/* Live preview */}
                                    {formData.annual_increase_pct && formData.monthly_rent && (
                                        <p className="mt-2 text-[14px] text-blue-700 bg-blue-50 px-3 py-2 rounded-lg font-medium">
                                            {formData.increase_type === 'percentage'
                                                ? `Con ${formData.annual_increase_pct}% → RD$${(parseFloat(formData.monthly_rent) * (1 + parseFloat(formData.annual_increase_pct) / 100)).toLocaleString('es-DO', { minimumFractionDigits: 2 })} el próximo año`
                                                : `RD$${parseFloat(formData.monthly_rent).toLocaleString('es-DO')} + RD$${parseFloat(formData.annual_increase_pct).toLocaleString('es-DO')} = RD$${(parseFloat(formData.monthly_rent) + parseFloat(formData.annual_increase_pct)).toLocaleString('es-DO', { minimumFractionDigits: 2 })} el próximo año`
                                            }
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b pb-2 mb-3 pt-2">Notas</p>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Descripción / Notas <span className="text-gray-400 font-normal">(opcional)</span>
                                </label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleChange}
                                    placeholder="Características especiales, observaciones, etc."
                                    maxLength={500}
                                    rows={3}
                                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none ${errors.notes ? 'border-red-500' : 'border-gray-300'}`}
                                />
                                {errors.notes && <p className="mt-1 text-xs text-red-600">{errors.notes}</p>}
                                <p className="mt-1 text-xs text-gray-400 text-right">{formData.notes.length}/500</p>
                            </div>
                        </div>
                    </div>
                </div>

                {errors.submit && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mt-4">
                        {errors.submit}
                    </div>
                )}

                <div className="flex gap-3 justify-end pt-6 mt-4 border-t border-gray-100">
                    <Button type="button" variant="secondary" onClick={handleClose}>
                        Cancelar
                    </Button>
                    <Button type="submit" variant="primary" disabled={saving}>
                        {saving ? 'Guardando...' : propertyToEdit ? 'Guardar Cambios' : 'Registrar Propiedad'}
                    </Button>
                </div>
            </form>
        </Modal>
    )
}

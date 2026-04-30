import { useState } from 'react'
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
    increase_type: 'percentage'
}

export default function RegisterPropertyModal({ isOpen, onClose, onSuccess }) {
    const { addProperty } = useProperties()
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState({})
    const [formData, setFormData] = useState(EMPTY_FORM)

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }))
    }

    const validate = () => {
        const newErrors = {}

        const nameError = validatePropertyName(formData.name)
        if (nameError) newErrors.name = nameError

        if (!formData.address || formData.address.trim().length === 0) {
            newErrors.address = 'La dirección es obligatoria'
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

        setLoading(true)

        const propertyData = {
            name: formData.name.trim(),
            address: formData.address.trim(),
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

        const { data, error } = await addProperty(propertyData)
        setLoading(false)

        if (error) {
            if (error.includes('duplicate') || error.includes('unique')) {
                setErrors({ name: 'Ya existe una propiedad con este nombre' })
            } else {
                setErrors({ submit: error })
            }
            return
        }

        setFormData(EMPTY_FORM)
        setErrors({})
        if (onSuccess) onSuccess(data)
        onClose()
    }

    const handleClose = () => {
        if (!loading) {
            setFormData(EMPTY_FORM)
            setErrors({})
            onClose()
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Registrar Nueva Propiedad" size="lg">
            <form onSubmit={handleSubmit} className="space-y-1">

                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider pb-2">Identificación</p>
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
                    label="Dirección Completa"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    error={errors.address}
                    required
                    placeholder="Ej: Calle Principal #123, Santo Domingo"
                    maxLength={255}
                />

                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-3 pb-2">Detalles físicos</p>
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

                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-3 pb-2">Contrato</p>
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
                        label="Depósito de garantía (RD$)"
                        name="deposit_amount"
                        type="number"
                        value={formData.deposit_amount}
                        onChange={handleChange}
                        placeholder="Ej: 30000"
                        min="0"
                        step="0.01"
                    />
                </div>
                <div className="mb-3">
                    <label className="accessible-label">Incremento Anual</label>
                    {/* Toggle tipo */}
                    <div className="flex rounded-lg overflow-hidden border-2 border-gray-200 mb-2" style={{ height: '48px' }}>
                        <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, increase_type: 'percentage' }))}
                            className={`flex-1 font-semibold text-[16px] transition ${
                                formData.increase_type === 'percentage'
                                    ? 'bg-blue-600 text-white'
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
                                    ? 'bg-blue-600 text-white'
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
                        <p className="mt-2 text-[16px] text-blue-700 bg-blue-50 px-3 py-2 rounded-lg font-medium">
                            {formData.increase_type === 'percentage'
                                ? `Con ${formData.annual_increase_pct}% → RD$${(parseFloat(formData.monthly_rent) * (1 + parseFloat(formData.annual_increase_pct) / 100)).toLocaleString('es-DO', { minimumFractionDigits: 2 })} el próximo año`
                                : `RD$${parseFloat(formData.monthly_rent).toLocaleString('es-DO')} + RD$${parseFloat(formData.annual_increase_pct).toLocaleString('es-DO')} = RD$${(parseFloat(formData.monthly_rent) + parseFloat(formData.annual_increase_pct)).toLocaleString('es-DO', { minimumFractionDigits: 2 })} el próximo año`
                            }
                        </p>
                    )}
                </div>

                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-3 pb-2">Notas</p>
                <div className="mb-4">
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
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${errors.notes ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {errors.notes && <p className="mt-1 text-xs text-red-600">{errors.notes}</p>}
                    <p className="mt-1 text-xs text-gray-400 text-right">{formData.notes.length}/500</p>
                </div>

                {errors.submit && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        {errors.submit}
                    </div>
                )}

                <div className="flex gap-3 justify-end pt-4">
                    <Button type="button" variant="secondary" onClick={handleClose} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button type="submit" variant="primary" disabled={loading}>
                        {loading ? 'Guardando...' : 'Registrar Propiedad'}
                    </Button>
                </div>
            </form>
        </Modal>
    )
}

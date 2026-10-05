// src/components/Modals/RegisterUtilityModal.jsx
import { useState, useEffect } from 'react'
import Modal from '../Common/Modal'
import FormInput from '../Common/FormInput'
import PropertyPicker from '../Common/PropertyPicker'
import Button from '../Common/Button'
import { useUtilityReadings } from '../../hooks/useUtilityReadings'
import { useProperties } from '../../hooks/useProperties'

const UTILITY_CONFIG = {
    gas: {
        label: 'Gas',
        icon: '🔥',
        unit: 'GL',
        unitLabel: 'Galones',
        costLabel: 'Costo por galón (RD$)',
        costPlaceholder: '150',
    },
    electricity: {
        label: 'Luz (Electricidad)',
        icon: '💡',
        unit: 'kWh',
        unitLabel: 'Kilowatts/hora',
        costLabel: 'Costo por kWh (RD$)',
        costPlaceholder: '12',
    },
    water: {
        label: 'Agua',
        icon: '💧',
        unit: 'm³',
        unitLabel: 'Metros cúbicos',
        costLabel: 'Costo por m³ (RD$)',
        costPlaceholder: '50',
    },
}

const EMPTY_FORM = {
    property_id: '',
    reading_date: new Date().toISOString().split('T')[0],
    current_reading: '',
    previous_reading: '',
    cost_per_unit: '',
}

export default function RegisterUtilityModal({ isOpen, utilityType, onClose, onSuccess }) {
    const { properties } = useProperties()
    const { addReading, getLatestReadingForProperty } = useUtilityReadings(utilityType)
    const [formData, setFormData] = useState(EMPTY_FORM)
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState({})
    const [prevReadingInfo, setPrevReadingInfo] = useState(null) // null | 'none' | { value, date }

    const config = UTILITY_CONFIG[utilityType] || UTILITY_CONFIG.gas

    const safeProperties = Array.isArray(properties) ? properties : []

    const consumption = formData.current_reading && formData.previous_reading
        ? Math.max(0, parseFloat(formData.current_reading) - parseFloat(formData.previous_reading))
        : 0

    const totalCost = consumption && formData.cost_per_unit
        ? consumption * parseFloat(formData.cost_per_unit)
        : 0

    useEffect(() => {
        if (!isOpen) return
        setFormData(EMPTY_FORM)
        setErrors({})
        setPrevReadingInfo(null)
    }, [isOpen, utilityType])

    const handlePropertyChange = async (propertyId) => {
        setFormData(prev => ({ ...prev, property_id: propertyId, previous_reading: '' }))
        setPrevReadingInfo(null)
        if (propertyId) {
            const { data: latest } = await getLatestReadingForProperty(propertyId)
            if (latest) {
                setFormData(prev => ({ ...prev, property_id: propertyId, previous_reading: String(latest.current_reading) }))
                setPrevReadingInfo({ value: latest.current_reading, date: latest.reading_date })
            } else {
                setPrevReadingInfo('none')
            }
        }
    }

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }))
    }

    const validate = () => {
        const newErrors = {}
        if (!formData.property_id) newErrors.property_id = 'Selecciona una propiedad'
        if (!formData.reading_date) newErrors.reading_date = 'La fecha es obligatoria'
        if (!formData.current_reading || parseFloat(formData.current_reading) <= 0)
            newErrors.current_reading = 'Ingresa la lectura actual'
        if (formData.previous_reading && parseFloat(formData.current_reading) < parseFloat(formData.previous_reading))
            newErrors.current_reading = 'La lectura actual no puede ser menor a la anterior'
        if (!formData.cost_per_unit || parseFloat(formData.cost_per_unit) <= 0)
            newErrors.cost_per_unit = 'Ingresa el costo por unidad'
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!validate()) return
        setLoading(true)
        try {
            const { error } = await addReading({
                property_id: formData.property_id,
                reading_date: formData.reading_date,
                previous_reading: formData.previous_reading ? parseFloat(formData.previous_reading) : 0,
                current_reading: parseFloat(formData.current_reading),
                price_per_unit: parseFloat(formData.cost_per_unit),
                consumption_volume: consumption,
                total_cost: totalCost,
                paid: false,
                payment_date: null,
                utility_type: utilityType,
            })
            if (error) throw new Error(error)
            if (onSuccess) onSuccess()
            onClose()
        } catch (err) {
            setErrors({ submit: err.message })
        } finally {
            setLoading(false)
        }
    }

    if (!utilityType) return null

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`${config.icon} Registrar ${config.label}`} size="md">
            <form onSubmit={handleSubmit}>
                <PropertyPicker
                    properties={safeProperties}
                    value={formData.property_id}
                    onChange={handlePropertyChange}
                    error={errors.property_id}
                    required
                />

                <FormInput
                    label="Fecha de Lectura"
                    name="reading_date"
                    type="date"
                    value={formData.reading_date}
                    onChange={handleChange}
                    error={errors.reading_date}
                    required
                    max={new Date().toISOString().split('T')[0]}
                />

                <div className="grid grid-cols-2 gap-4">
                    <div>
                    <FormInput
                        label={`Lectura Anterior (${config.unit})`}
                        name="previous_reading"
                        type="number"
                        value={formData.previous_reading}
                        onChange={handleChange}
                        placeholder={prevReadingInfo === 'none' ? 'Ingresa valor inicial' : 'Auto desde última lectura'}
                        min="0"
                        step="0.01"
                    />
                    {prevReadingInfo === 'none' && (
                        <p style={{ fontSize: 11, color: 'var(--wp-text-muted)', marginTop: -8, marginBottom: 8 }}>
                            ⚡ Primera lectura — ingresa el valor inicial del medidor
                        </p>
                    )}
                    {prevReadingInfo && prevReadingInfo !== 'none' && (
                        <p style={{ fontSize: 11, color: 'var(--wp-green)', marginTop: -8, marginBottom: 8 }}>
                            ✓ Del {new Date(prevReadingInfo.date + 'T00:00:00').toLocaleDateString('es-DO', { day: '2-digit', month: 'short' })} · {prevReadingInfo.value} {config.unit}
                        </p>
                    )}
                    </div>
                    <FormInput
                        label={`Lectura Actual (${config.unit})`}
                        name="current_reading"
                        type="number"
                        value={formData.current_reading}
                        onChange={handleChange}
                        error={errors.current_reading}
                        required
                        placeholder="Ej: 245"
                        min="0"
                        step="0.01"
                    />
                </div>

                <FormInput
                    label={config.costLabel}
                    name="cost_per_unit"
                    type="number"
                    value={formData.cost_per_unit}
                    onChange={handleChange}
                    error={errors.cost_per_unit}
                    required
                    placeholder={config.costPlaceholder}
                    min="0"
                    step="0.01"
                />

                {consumption > 0 && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-[16px] font-semibold text-blue-800">
                            Consumo: <strong>{consumption.toFixed(2)} {config.unit}</strong>
                        </p>
                        {totalCost > 0 && (
                            <p className="text-[18px] font-bold text-blue-900 mt-1">
                                Total: <strong>RD${totalCost.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</strong>
                            </p>
                        )}
                    </div>
                )}

                {errors.submit && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-[16px]">
                        {errors.submit}
                    </div>
                )}

                <div className="flex gap-3 justify-end mt-6">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Cancelar</Button>
                    <Button type="submit" variant="primary" disabled={loading}>
                        {loading ? 'Guardando...' : 'Registrar Lectura'}
                    </Button>
                </div>
            </form>
        </Modal>
    )
}

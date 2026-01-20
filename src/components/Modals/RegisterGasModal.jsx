import { useState, useEffect } from 'react'
import Modal from '../Common/Modal'
import FormInput from '../Common/FormInput'
import Button from '../Common/Button'
import { useProperties } from '../../hooks/useProperties'
import { useGasReadings } from '../../hooks/useGasReadings'
import { format } from 'date-fns'

export default function RegisterGasModal({ isOpen, onClose, onSuccess }) {
    const { properties } = useProperties()
    const { addGasReading, getReadingsByProperty } = useGasReadings()
    const [loading, setLoading] = useState(false)

    const [formData, setFormData] = useState({
        property_id: '',
        reading_date: new Date().toISOString().split('T')[0], // Can be changed by user
        current_reading: '',
        price_per_unit: '',
        notes: ''
    })

    const [lastReading, setLastReading] = useState(null)
    const [calculated, setCalculated] = useState(null)
    const [error, setError] = useState(null)

    // SAFE: Load last reading with error handling
    useEffect(() => {
        if (formData.property_id) {
            setError(null) // Clear previous errors
            getReadingsByProperty(formData.property_id)
                .then(({ data, error: readError }) => {
                    if (readError) {
                        console.warn('Error loading readings:', readError)
                        setLastReading(null)
                    } else if (data && data.length > 0) {
                        // Assuming getReadingsByProperty returns sorted DESC
                        setLastReading(data[0])
                        console.log("Found last reading:", data[0])
                    } else {
                        setLastReading(null)
                    }
                })
                .catch(err => {
                    console.error('Failed to fetch readings:', err)
                    setLastReading(null)
                })
        } else {
            setLastReading(null)
        }
    }, [formData.property_id, getReadingsByProperty])

    // Calculate consumption and cost live
    useEffect(() => {
        const current = parseFloat(formData.current_reading)
        const price = parseFloat(formData.price_per_unit)

        if (!isNaN(current) && !isNaN(price) && current >= 0 && price >= 0) {
            const previous = lastReading ? lastReading.current_reading : 0
            const consumption = Math.max(0, current - previous)
            const cost = consumption * price

            setCalculated({ consumption, cost, previous })
        } else {
            setCalculated(null)
        }
    }, [formData.current_reading, formData.price_per_unit, lastReading])

    const validate = () => {
        // Check Date vs Last Reading
        if (lastReading) {
            const today = new Date().toISOString().split('T')[0]
            if (lastReading.reading_date >= today) {
                setError(`Ya existe una lectura con fecha ${lastReading.reading_date}. No puede registrar otra hoy.`)
                return false
            }
        }

        // Check Reading value
        if (lastReading && parseFloat(formData.current_reading) < lastReading.current_reading) {
            setError('La lectura actual no puede ser menor a la anterior.')
            return false
        }

        if (!formData.property_id) {
            setError('Debe seleccionar una propiedad.')
            return false
        }

        if (!formData.current_reading || parseFloat(formData.current_reading) < 0) {
            setError('La lectura debe ser un número válido mayor o igual a 0.')
            return false
        }

        if (!formData.price_per_unit || parseFloat(formData.price_per_unit) <= 0) {
            setError('El precio debe ser mayor a 0.')
            return false
        }

        return true
    }

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        setError(null)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!validate()) return

        setLoading(true)

        try {
            const readingData = {
                property_id: formData.property_id,
                reading_date: formData.reading_date,
                current_reading: parseFloat(formData.current_reading),
                previous_reading: calculated ? calculated.previous : 0,
                consumption_volume: calculated ? calculated.consumption : 0,
                price_per_unit: parseFloat(formData.price_per_unit),
                total_cost: calculated ? calculated.cost : 0,
                notes: formData.notes
            }

            const { error } = await addGasReading(readingData)
            if (error) throw new Error(error)

            if (onSuccess) onSuccess()
            onClose()
            // Reset
            setFormData({
                property_id: '',
                reading_date: new Date().toISOString().split('T')[0],
                current_reading: '',
                price_per_unit: '',
                notes: ''
            })
            setLastReading(null)
            setCalculated(null)

        } catch (err) {
            console.error(err)
            setError("Error al registrar: " + (err.message || "Verifique los datos"))
        } finally {
            setLoading(false)
        }
    }

    // SAFE: Ensure properties is array
    const safeProperties = Array.isArray(properties) ? properties : []

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Registrar Consumo de Gas">
            <form onSubmit={handleSubmit} className="space-y-4">
                <FormInput
                    label="Propiedad"
                    name="property_id"
                    type="select"
                    value={formData.property_id}
                    onChange={handleChange}
                    required
                >
                    <option value="">Seleccionar propiedad...</option>
                    {safeProperties.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </FormInput>

                {error && <div className="p-3 bg-red-100 text-red-700 rounded text-sm border border-red-200">{error}</div>}

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Lectura Anterior</label>
                        <div className="px-3 py-2 bg-gray-100 rounded text-gray-600 text-sm">
                            {lastReading ? `${lastReading.current_reading} (${format(new Date(lastReading.reading_date), 'dd/MM/yyyy')})` : 'N/A (Inicial)'}
                        </div>
                    </div>
                    <FormInput
                        label="Fecha Medición"
                        name="reading_date"
                        type="date"
                        value={formData.reading_date}
                        onChange={handleChange}
                        max={new Date().toISOString().split('T')[0]}
                        required
                    />
                </div>

                <FormInput
                    label="Lectura Actual"
                    name="current_reading"
                    type="number"
                    value={formData.current_reading}
                    onChange={handleChange}
                    required
                    min={lastReading ? lastReading.current_reading : 0}
                    step="0.01"
                />

                <FormInput
                    label="Precio por Unidad (RD$)"
                    name="price_per_unit"
                    type="number"
                    value={formData.price_per_unit}
                    onChange={handleChange}
                    required
                    min="0.01"
                    step="0.01"
                />

                {calculated && (
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                        <div className="flex justify-between mb-1">
                            <span className="text-sm text-blue-800">Consumo:</span>
                            <span className="font-bold text-blue-900">{calculated.consumption.toFixed(2)} unidades</span>
                        </div>
                        <div className="flex justify-between border-t border-blue-200 pt-1 mt-1">
                            <span className="text-sm text-blue-800">Costo Total:</span>
                            <span className="font-bold text-blue-900">RD$ {calculated.cost.toLocaleString()}</span>
                        </div>
                    </div>
                )}

                <FormInput label="Notas" name="notes" value={formData.notes} onChange={handleChange} />

                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="secondary" onClick={onClose} type="button">Cancelar</Button>
                    <Button variant="primary" type="submit" disabled={loading || !!error}>
                        {loading ? 'Registrando...' : 'Registrar Lectura'}
                    </Button>
                </div>
            </form>
        </Modal>
    )
}

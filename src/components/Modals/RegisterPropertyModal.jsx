import { useState } from 'react'
import Modal from '../Common/Modal'
import FormInput from '../Common/FormInput'
import Button from '../Common/Button'
import { validatePropertyName, validateMonthlyRent } from '../../lib/validators'
import { useProperties } from '../../hooks/useProperties'

export default function RegisterPropertyModal({ isOpen, onClose, onSuccess }) {
    const { addProperty } = useProperties()
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState({})

    const [formData, setFormData] = useState({
        name: '',
        address: '',
        monthly_rent: '',
        bedrooms: '',
        bathrooms: ''
    })

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        // Clear error when user types
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }))
        }
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
            bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : 1
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

        // Reset form
        setFormData({
            name: '',
            address: '',
            monthly_rent: '',
            bedrooms: '',
            bathrooms: ''
        })
        setErrors({})

        if (onSuccess) onSuccess(data)
        onClose()
    }

    const handleClose = () => {
        if (!loading) {
            setFormData({
                name: '',
                address: '',
                monthly_rent: '',
                bedrooms: '',
                bathrooms: ''
            })
            setErrors({})
            onClose()
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Registrar Nueva Propiedad" size="md">
            <form onSubmit={handleSubmit}>
                <FormInput
                    label="Nombre/Código del Apartamento"
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
                        label="Habitaciones"
                        name="bedrooms"
                        type="select"
                        value={formData.bedrooms}
                        onChange={handleChange}
                    >
                        <option value="">Seleccionar</option>
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
                        <option value="">Seleccionar</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4+</option>
                    </FormInput>
                </div>



                {errors.submit && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        {errors.submit}
                    </div>
                )}

                <div className="flex gap-3 justify-end mt-6">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={handleClose}
                        disabled={loading}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        disabled={loading}
                    >
                        {loading ? 'Guardando...' : 'Registrar Propiedad'}
                    </Button>
                </div>
            </form>
        </Modal>
    )
}

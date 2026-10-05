import { useState, useEffect } from 'react'
import Modal from '../Common/Modal'
import FormInput from '../Common/FormInput'
import Button from '../Common/Button'
import { validatePropertyName, validateMonthlyRent } from '../../lib/validators'
import { useProperties } from '../../hooks/useProperties'

const emptyForm = { name: '', address: '', monthly_rent: '', bedrooms: '', bathrooms: '', building_id: '' }

/** Create or edit a property (edit when `property` is passed). */
export default function RegisterPropertyModal({ isOpen, onClose, onSuccess, property, buildings = [], onNewBuilding }) {
    const { addProperty, updateProperty } = useProperties()
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState({})
    const [formData, setFormData] = useState(emptyForm)
    const isEdit = !!property

    useEffect(() => {
        if (!isOpen) return
        setErrors({})
        setFormData(property ? {
            name: property.name || '',
            address: property.address || '',
            monthly_rent: property.monthly_rent ?? '',
            bedrooms: property.bedrooms ? String(property.bedrooms) : '',
            bathrooms: property.bathrooms ? String(property.bathrooms) : '',
            building_id: property.building_id || ''
        } : emptyForm)
    }, [isOpen, property])

    const selectedBuilding = buildings.find(b => b.id === formData.building_id)

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
        if (!selectedBuilding && !formData.address.trim()) newErrors.address = 'La dirección es obligatoria (o elija un edificio)'
        else if (formData.address.length > 255) newErrors.address = 'La dirección no puede exceder 255 caracteres'
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
            address: (formData.address.trim() || selectedBuilding?.address || ''),
            monthly_rent: parseFloat(formData.monthly_rent),
            bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : 1,
            bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : 1
        }
        // Only send building_id when relevant so the app keeps working before the migration is applied
        if (formData.building_id) propertyData.building_id = formData.building_id
        else if (isEdit && property.building_id) propertyData.building_id = null

        const { data, error } = isEdit
            ? await updateProperty(property.id, propertyData)
            : await addProperty(propertyData)
        setLoading(false)

        if (error) {
            if (error.includes('duplicate') || error.includes('unique')) {
                setErrors({ name: 'Ya existe una propiedad con este nombre' })
            } else {
                setErrors({ submit: error })
            }
            return
        }
        onSuccess?.(data)
        onClose()
    }

    return (
        <Modal isOpen={isOpen} onClose={() => !loading && onClose()} title={isEdit ? 'Editar Propiedad' : 'Nueva Propiedad'} size="md">
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
                    <FormInput label="Nombre / Código" name="name" value={formData.name} onChange={handleChange}
                        error={errors.name} required placeholder="Ej: APARTAMENTO 4-A" maxLength={50} />
                    <FormInput label="Edificio" name="building_id" type="select" value={formData.building_id} onChange={handleChange}>
                        <option value="">Sin edificio</option>
                        {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        {onNewBuilding && <option value="__new__">+ Nuevo edificio...</option>}
                    </FormInput>
                </div>

                <FormInput label={selectedBuilding ? 'Dirección (opcional, usa la del edificio)' : 'Dirección'} name="address"
                    value={formData.address} onChange={handleChange} error={errors.address}
                    placeholder={selectedBuilding?.address || 'Ej: Calle Principal #123, Santo Domingo'} maxLength={255} />

                <div className="grid grid-cols-3 gap-3">
                    <FormInput label="Alquiler mensual (RD$)" name="monthly_rent" type="number" value={formData.monthly_rent}
                        onChange={handleChange} error={errors.monthly_rent} required placeholder="15000" min="0" step="0.01" />
                    <FormInput label="Hab." name="bedrooms" type="select" value={formData.bedrooms} onChange={handleChange}>
                        <option value="">-</option>
                        {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
                        <option value="5">5+</option>
                    </FormInput>
                    <FormInput label="Baños" name="bathrooms" type="select" value={formData.bathrooms} onChange={handleChange}>
                        <option value="">-</option>
                        {[1, 2, 3].map(n => <option key={n} value={n}>{n}</option>)}
                        <option value="4">4+</option>
                    </FormInput>
                </div>

                {errors.submit && (
                    <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{errors.submit}</div>
                )}

                <div className="flex gap-2 justify-end mt-4">
                    <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={loading}>Cancelar</Button>
                    <Button type="submit" size="sm" disabled={loading}>
                        {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Registrar Propiedad'}
                    </Button>
                </div>
            </form>
        </Modal>
    )
}

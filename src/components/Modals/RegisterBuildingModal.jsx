import { useState, useEffect } from 'react'
import Modal from '../Common/Modal'
import FormInput from '../Common/FormInput'
import Button from '../Common/Button'

export default function RegisterBuildingModal({ isOpen, onClose, onSave, building }) {
    const [form, setForm] = useState({ name: '', address: '' })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (isOpen) {
            setForm({ name: building?.name || '', address: building?.address || '' })
            setError('')
        }
    }, [isOpen, building])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!form.name.trim()) return setError('El nombre es obligatorio')
        setLoading(true)
        const { error: err } = await onSave({ name: form.name.trim(), address: form.address.trim() }, building)
        setLoading(false)
        if (err) return setError(err)
        onClose()
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={building ? 'Editar Edificio' : 'Nuevo Edificio'} size="sm">
            <form onSubmit={handleSubmit}>
                <FormInput label="Nombre del edificio" name="name" value={form.name} required maxLength={80}
                    placeholder="Ej: Duarte #4" onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
                <FormInput label="Dirección" name="address" value={form.address} maxLength={255}
                    placeholder="Ej: Calle Duarte #4, Santo Domingo" onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} />
                {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" size="sm" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" size="sm" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
                </div>
            </form>
        </Modal>
    )
}

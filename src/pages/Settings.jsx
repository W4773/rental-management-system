import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { useApp } from '../contexts/AppContext'

export default function Settings() {
    const { user } = useAuth()
    const [formData, setFormData] = useState({
        name: user?.user_metadata?.name || user?.email?.split('@')[0] || '',
        email: user?.email || '',
        newPassword: '',
        confirmPassword: ''
    })
    const [loading, setLoading] = useState(false)
    const { toast: toastApi } = useApp()
    const showToast = (msg, type) => toastApi.showToast(msg, type)

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
            showToast('Las contraseñas no coinciden', 'error')
            return
        }

        setLoading(true)

        try {
            const updateData = {}

            if (formData.newPassword) {
                updateData.password = formData.newPassword
            }

            if (formData.email !== user?.email) {
                updateData.email = formData.email
            }

            if (updateData.password || updateData.email) {
                const { error } = await supabase.auth.updateUser(updateData)
                if (error) throw error
            }

            showToast('Configuración actualizada exitosamente', 'success')
            setFormData({ ...formData, newPassword: '', confirmPassword: '' })
        } catch (error) {
            showToast(error.message || 'Error al actualizar configuración', 'error')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div>
            <main className="max-w-3xl mx-auto">
                <div className="bg-white rounded-xl border border-brand-100 shadow-sm p-5">
                    <h1 className="text-xl font-bold text-ink mb-4">Configuración de cuenta</h1>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Nombre de Usuario
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Tu nombre"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Correo Electrónico
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="tucorreo@ejemplo.com"
                            />
                        </div>

                        <div className="border-t pt-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cambiar Contraseña</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Nueva Contraseña
                                    </label>
                                    <input
                                        type="password"
                                        name="newPassword"
                                        value={formData.newPassword}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Dejar vacío para no cambiar"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Confirmar Nueva Contraseña
                                    </label>
                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Confirmar contraseña"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-brand-600 text-white px-5 py-2 rounded-lg hover:bg-brand-700 transition disabled:opacity-50"
                            >
                                {loading ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    )
}

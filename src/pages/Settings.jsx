import { useState } from 'react'
import Header from '../components/Common/Header'
import Footer from '../components/Common/Footer'
import InvoiceSettings from '../components/Settings/InvoiceSettings'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import Toast, { useToast } from '../components/Common/Toast'

const TABS = [
    { id: 'account', label: '👤 Cuenta' },
    { id: 'invoice', label: '🧾 Factura' },
]

export default function Settings() {
    const { user } = useAuth()
    const [activeTab, setActiveTab] = useState('account')
    const [formData, setFormData] = useState({
        name: user?.user_metadata?.name || user?.email?.split('@')[0] || '',
        email: user?.email || '',
        newPassword: '',
        confirmPassword: ''
    })
    const [loading, setLoading] = useState(false)
    const { toast, showToast, hideToast } = useToast()

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
            if (formData.newPassword) updateData.password = formData.newPassword
            if (formData.email !== user?.email) updateData.email = formData.email
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
        <div className="min-h-screen bg-[#f8fafc] flex flex-col">
            <Header />
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
                <h1 className="text-[24px] font-bold text-gray-900 mb-6">⚙️ Configuración</h1>

                {/* Tabs */}
                <div className="flex gap-2 border-b-2 border-gray-200 mb-6">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-5 py-3 font-semibold text-[18px] border-b-4 transition ${
                                activeTab === tab.id
                                    ? 'border-blue-600 text-blue-700'
                                    : 'border-transparent text-gray-600 hover:text-gray-900'
                            }`}
                            style={{ minHeight: '48px' }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-8">
                    {activeTab === 'account' && (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <h3 className="text-[20px] font-bold text-gray-900 mb-2">Datos de la Cuenta</h3>
                            <div>
                                <label className="accessible-label">Nombre de Usuario</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="accessible-input"
                                    placeholder="Tu nombre"
                                />
                            </div>
                            <div>
                                <label className="accessible-label">Correo Electrónico</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="accessible-input"
                                    placeholder="tucorreo@ejemplo.com"
                                />
                            </div>
                            <div className="border-t-2 border-gray-200 pt-6">
                                <h4 className="text-[18px] font-bold text-gray-900 mb-4">Cambiar Contraseña</h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="accessible-label">Nueva Contraseña</label>
                                        <input
                                            type="password"
                                            name="newPassword"
                                            value={formData.newPassword}
                                            onChange={handleChange}
                                            className="accessible-input"
                                            placeholder="Dejar vacío para no cambiar"
                                        />
                                    </div>
                                    <div>
                                        <label className="accessible-label">Confirmar Contraseña</label>
                                        <input
                                            type="password"
                                            name="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                            className="accessible-input"
                                            placeholder="Repetir nueva contraseña"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-[18px]"
                                    style={{ minHeight: '48px' }}
                                >
                                    {loading ? 'Guardando...' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </form>
                    )}

                    {activeTab === 'invoice' && (
                        <InvoiceSettings showToast={showToast} />
                    )}
                </div>
            </main>
            <Footer />
            {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
        </div>
    )
}

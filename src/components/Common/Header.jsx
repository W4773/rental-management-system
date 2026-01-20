import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Header() {
    const { user, signOut } = useAuth()
    const navigate = useNavigate()

    const handleLogout = async () => {
        await signOut()
        navigate('/login')
    }

    // Extract name from email (before @)
    const userName = user?.email?.split('@')[0] || 'Usuario'

    return (
        <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">🏠 Rental Manager</h1>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="text-sm text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100 transition font-medium"
                    >
                        🏠 Inicio
                    </button>
                    <button
                        onClick={() => navigate('/reports')}
                        className="text-sm text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100 transition font-medium"
                    >
                        📊 Reportes
                    </button>
                    <span className="text-sm text-gray-600 font-medium">👤 {userName}</span>
                    <button
                        onClick={() => navigate('/settings')}
                        className="text-sm text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100 transition"
                    >
                        ⚙️ Configuración
                    </button>
                    <button
                        onClick={handleLogout}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition text-sm font-medium"
                    >
                        Cerrar Sesión
                    </button>
                </div>
            </div>
        </header>
    )
}

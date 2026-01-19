import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate, Link } from 'react-router-dom'
import Button from '../components/Common/Button'
import FormInput from '../components/Common/FormInput'

export default function Login() {
    const { signIn } = useAuth()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    })

    const handleChange = (e) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }))
        setError(null)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const { error: signInError } = await signIn(formData.email, formData.password)

        if (signInError) {
            setError(signInError)
            setLoading(false)
        } else {
            navigate('/dashboard')
        }
    }

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">🏠 Rental Manager</h1>
                    <p className="text-gray-500">Inicia sesión para continuar</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    <FormInput
                        label="Correo Electrónico"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        autoComplete="email"
                        placeholder="tu@email.com"
                    />

                    <FormInput
                        label="Contraseña"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        autoComplete="current-password"
                        placeholder="••••••••"
                    />

                    <Button
                        variant="primary"
                        type="submit"
                        disabled={loading}
                        className="w-full"
                    >
                        {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                    </Button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-gray-600 text-sm">
                        ¿No tienes cuenta?{' '}
                        <Link to="/register" className="text-blue-600 hover:underline font-medium">
                            Regístrate aquí
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}

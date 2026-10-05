import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate, Link } from 'react-router-dom'
import Button from '../components/Common/Button'
import FormInput from '../components/Common/FormInput'

export default function Register() {
    const { signUp } = useAuth()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(false)
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        fullName: ''
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

        // Validation
        if (formData.password !== formData.confirmPassword) {
            setError('Las contraseñas no coinciden')
            setLoading(false)
            return
        }

        if (formData.password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres')
            setLoading(false)
            return
        }

        const { error: signUpError } = await signUp(
            formData.email,
            formData.password,
            { full_name: formData.fullName }
        )

        if (signUpError) {
            setError(signUpError)
            setLoading(false)
        } else {
            setSuccess(true)
            setTimeout(() => navigate('/login'), 2000)
        }
    }

    if (success) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md text-center">
                    <div className="text-6xl mb-4">✅</div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Registro Exitoso!</h2>
                    <p className="text-gray-600 mb-4">
                        Te hemos enviado un correo de confirmación.
                    </p>
                    <p className="text-sm text-gray-500">
                        Redirigiendo al login...
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">🏠 Crear Cuenta</h1>
                    <p className="text-gray-500">Regístrate para gestionar tus propiedades</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    <FormInput
                        label="Nombre Completo"
                        name="fullName"
                        type="text"
                        value={formData.fullName}
                        onChange={handleChange}
                        required
                        placeholder="Juan Pérez"
                    />

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
                        autoComplete="new-password"
                        placeholder="Mínimo 6 caracteres"
                    />

                    <FormInput
                        label="Confirmar Contraseña"
                        name="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                        autoComplete="new-password"
                        placeholder="Repite tu contraseña"
                    />

                    <Button
                        variant="primary"
                        type="submit"
                        disabled={loading}
                        className="w-full"
                    >
                        {loading ? 'Creando cuenta...' : 'Registrarse'}
                    </Button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-gray-600 text-sm">
                        ¿Ya tienes cuenta?{' '}
                        <Link to="/login" className="text-blue-600 hover:underline font-medium">
                            Inicia sesión aquí
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}

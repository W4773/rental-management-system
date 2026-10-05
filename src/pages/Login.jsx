import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate, Link } from 'react-router-dom'

export default function Login() {
    const { signIn } = useAuth()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [showPassword, setShowPassword] = useState(false)
    const [rememberMe, setRememberMe] = useState(false)
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

    const togglePasswordVisibility = () => {
        setShowPassword(prev => !prev)
    }

    return (
        <div className="login-page min-h-screen flex items-center justify-center p-4 relative">
            {/* Animated gradient background */}
            <div className="login-background"></div>

            {/* Glassmorphism container */}
            <div className="login-container">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">🏠 Rental Manager</h1>
                    <p className="text-gray-300">Inicia sesión para continuar</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    {/* Email input with floating label */}
                    <div className="form-group">
                        <input
                            id="email"
                            type="email"
                            name="email"
                            className="form-input"
                            placeholder=" "
                            value={formData.email}
                            onChange={handleChange}
                            required
                            autoComplete="email"
                        />
                        <label htmlFor="email" className="form-label">
                            Correo Electrónico
                        </label>
                        <div className="validation-message"></div>
                    </div>

                    {/* Password input with toggle */}
                    <div className="form-group">
                        <div className="password-wrapper">
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                name="password"
                                className="form-input"
                                placeholder=" "
                                value={formData.password}
                                onChange={handleChange}
                                required
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={togglePasswordVisibility}
                                aria-label="Toggle password visibility"
                                aria-pressed={showPassword}
                            >
                                {showPassword ? (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                ) : (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                        <line x1="1" y1="1" x2="23" y2="23"></line>
                                    </svg>
                                )}
                            </button>
                        </div>
                        <label htmlFor="password" className="form-label">
                            Contraseña
                        </label>
                        <div className="validation-message"></div>
                    </div>

                    {/* Remember Me & Forgot Password */}
                    <div className="form-options">
                        <label className="checkbox-wrapper">
                            <input
                                type="checkbox"
                                className="checkbox-input"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                            />
                            <span className="checkbox-label">Recordar por 30 días</span>
                        </label>
                        <a href="#" className="link-forgot">¿Olvidaste tu contraseña?</a>
                    </div>

                    {/* Submit button */}
                    <button
                        type="submit"
                        className={`btn-login ${loading ? 'is-loading' : ''}`}
                        disabled={loading}
                        aria-busy={loading}
                    >
                        {loading && <span className="loader"></span>}
                        <span className="btn-text">{loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}</span>
                    </button>
                </form>

                {/* Sign up prompt */}
                <p className="signup-prompt">
                    ¿No tienes cuenta?{' '}
                    <Link to="/register" className="link-primary">
                        Regístrate aquí
                    </Link>
                </p>

                {/* Security footer */}
                <div className="security-footer">
                    <svg className="icon-lock" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    <span>Protegido con encriptación de 256 bits</span>
                </div>
            </div>
        </div>
    )
}


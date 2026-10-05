import { useState, useEffect, useRef } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Building2, House, Users, Flame, Bell, Settings, LogOut, AlertTriangle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/AppContext'

const TABS = [
    { to: '/', label: 'Inicio', icon: House, end: true },
    { to: '/propiedades', label: 'Propiedades', icon: Building2 },
    { to: '/inquilinos', label: 'Inquilinos', icon: Users },
    { to: '/gastos', label: 'Gastos', icon: Flame }
]

function useOutsideClose(ref, onClose) {
    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [ref, onClose])
}

export default function Header() {
    const { user, signOut } = useAuth()
    const { metrics } = useApp()
    const navigate = useNavigate()
    const [bellOpen, setBellOpen] = useState(false)
    const [menuOpen, setMenuOpen] = useState(false)
    const bellRef = useRef(null)
    const menuRef = useRef(null)
    useOutsideClose(bellRef, () => setBellOpen(false))
    useOutsideClose(menuRef, () => setMenuOpen(false))

    const initial = (user?.user_metadata?.name || user?.email || 'U').charAt(0).toUpperCase()
    const alerts = metrics.alerts

    const handleLogout = async () => {
        await signOut()
        navigate('/login')
    }

    return (
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-brand-100">
            <div className="max-w-[1500px] mx-auto px-3 sm:px-5 h-12 flex items-center gap-3">
                <Link to="/" className="flex items-center gap-2 shrink-0" aria-label="Alquiler Pro - ir al inicio">
                    <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 text-white flex items-center justify-center">
                        <Building2 className="w-4 h-4" />
                    </span>
                    <span className="font-bold text-ink hidden sm:inline">Alquiler Pro</span>
                </Link>

                <nav className="flex items-center gap-1 overflow-x-auto flex-1 min-w-0">
                    {TABS.map(({ to, label, icon: Icon, end }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={end}
                            className={({ isActive }) =>
                                `flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium whitespace-nowrap transition ${
                                    isActive ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200' : 'text-gray-600 hover:bg-gray-100'}`
                            }
                        >
                            <Icon className="w-4 h-4" />
                            <span className="hidden md:inline">{label}</span>
                            <span className="md:hidden">{label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="flex items-center gap-1.5 shrink-0">
                    <div className="relative" ref={bellRef}>
                        <button onClick={() => setBellOpen(o => !o)} aria-label="Alertas"
                            className="relative w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50">
                            <Bell className="w-4 h-4 text-gray-600" />
                            {alerts.length > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-accent-500 text-white text-[10px] font-bold flex items-center justify-center">
                                    {alerts.length > 99 ? '99+' : alerts.length}
                                </span>
                            )}
                        </button>
                        {bellOpen && (
                            <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
                                <p className="px-3 py-2 text-xs font-semibold text-gray-500 border-b">Alertas ({alerts.length})</p>
                                <ul className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                                    {alerts.length === 0 && <li className="px-3 py-4 text-sm text-gray-500 text-center">Todo al día</li>}
                                    {alerts.slice(0, 30).map(a => (
                                        <li key={a.id}>
                                            <button className="w-full text-left px-3 py-2 hover:bg-gray-50 flex gap-2"
                                                onClick={() => { setBellOpen(false); navigate(`/propiedades?p=${a.propertyId}`) }}>
                                                <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${a.type === 'error' ? 'text-red-500' : 'text-amber-500'}`} />
                                                <span>
                                                    <span className="block text-[13px] font-medium text-ink">{a.title}</span>
                                                    <span className="block text-xs text-gray-500">{a.subtitle}</span>
                                                </span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    <Link to="/settings" aria-label="Configuración"
                        className="w-8 h-8 rounded-lg border border-gray-200 hidden sm:flex items-center justify-center hover:bg-gray-50">
                        <Settings className="w-4 h-4 text-gray-600" />
                    </Link>

                    <div className="relative" ref={menuRef}>
                        <button onClick={() => setMenuOpen(o => !o)} aria-label="Cuenta"
                            className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white text-sm font-bold">
                            {initial}
                        </button>
                        {menuOpen && (
                            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-1">
                                <p className="px-3 py-2 text-xs text-gray-500 truncate border-b">{user?.email}</p>
                                <Link to="/settings" onClick={() => setMenuOpen(false)}
                                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50">
                                    <Settings className="w-4 h-4" /> Configuración
                                </Link>
                                <button onClick={handleLogout}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                                    <LogOut className="w-4 h-4" /> Cerrar sesión
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    )
}

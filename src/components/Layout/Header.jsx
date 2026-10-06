import { useState, useEffect, useRef } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Building2, House, DoorOpen, Users, Flame, Bell, Settings, LogOut, ChartColumn } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/AppContext'

const TABS = [
    { to: '/', label: 'Inicio', icon: House, end: true },
    { to: '/propiedades', label: 'Propiedades', icon: DoorOpen },
    { to: '/edificios', label: 'Edificios', icon: Building2 },
    { to: '/inquilinos', label: 'Inquilinos', icon: Users },
    { to: '/finanzas', label: 'Finanzas', icon: ChartColumn },
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
    const { alerts, openAlerts } = useApp()
    const navigate = useNavigate()
    const [menuOpen, setMenuOpen] = useState(false)
    const menuRef = useRef(null)
    useOutsideClose(menuRef, () => setMenuOpen(false))

    const initial = (user?.user_metadata?.name || user?.email || 'U').charAt(0).toUpperCase()
    const alertCount = alerts.total

    const handleLogout = async () => {
        await signOut()
        navigate('/login')
    }

    return (
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-brand-200">
            <div className="max-w-[1500px] mx-auto px-3 sm:px-5 h-12 flex items-center gap-3">
                <Link to="/" className="flex items-center gap-2 shrink-0" aria-label="Alquiler Pro - ir al inicio">
                    <img src="/logo-symbol.svg" alt="" className="h-7 w-7 sm:hidden" />
                    <img src="/logo.svg" alt="Alquiler Pro" className="hidden sm:block h-8 w-auto" />
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
                    <button onClick={openAlerts} aria-label={`Alertas de pago (${alertCount})`} title="Alertas de pago"
                        className={`relative w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-gray-50 ${alertCount > 0 ? 'border-amber-300 bg-amber-50' : 'border-gray-200'}`}>
                        <Bell className="w-4 h-4 text-gray-600" />
                        {alertCount > 0 && (
                            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                                {alertCount > 9 ? '9+' : alertCount}
                            </span>
                        )}
                    </button>

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

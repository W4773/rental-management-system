import { useState } from 'react'
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom'
import { House, DoorOpen, Users, ChartColumn, Ellipsis, Building2, Flame, Settings, LogOut } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import Modal from '../Common/Modal'

const MAIN = [
    { to: '/', label: 'Inicio', icon: House, end: true },
    { to: '/propiedades', label: 'Propiedades', icon: DoorOpen },
    { to: '/inquilinos', label: 'Inquilinos', icon: Users },
    { to: '/finanzas', label: 'Finanzas', icon: ChartColumn }
]
const MORE = [
    { to: '/edificios', label: 'Edificios', icon: Building2 },
    { to: '/gastos', label: 'Gastos', icon: Flame },
    { to: '/settings', label: 'Configuración', icon: Settings }
]

const tabClass = (active) =>
    `flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[56px] text-[10px] font-medium transition ${
        active ? 'text-brand-700' : 'text-gray-500'}`

/** Fixed bottom navigation for phones. "Más" opens a sheet with the remaining sections and the account. */
export default function BottomNav() {
    const { user, signOut } = useAuth()
    const navigate = useNavigate()
    const { pathname } = useLocation()
    const [moreOpen, setMoreOpen] = useState(false)
    const moreActive = MORE.some(m => pathname.startsWith(m.to))

    const handleLogout = async () => {
        setMoreOpen(false)
        await signOut()
        navigate('/login')
    }

    return (
        <>
            <nav aria-label="Navegación principal"
                className="md:hidden fixed bottom-0 inset-x-0 z-40 flex bg-white/95 backdrop-blur border-t border-brand-200 pb-[env(safe-area-inset-bottom)]">
                {MAIN.map(({ to, label, icon: Icon, end }) => (
                    <NavLink key={to} to={to} end={end} className={({ isActive }) => tabClass(isActive)}>
                        <Icon className="w-5 h-5" />
                        {label}
                    </NavLink>
                ))}
                <button type="button" onClick={() => setMoreOpen(true)} aria-haspopup="dialog" className={tabClass(moreActive)}>
                    <Ellipsis className="w-5 h-5" />
                    Más
                </button>
            </nav>

            <Modal isOpen={moreOpen} onClose={() => setMoreOpen(false)} title="Más" size="sm">
                <p className="text-xs text-gray-500 truncate mb-2">{user?.email}</p>
                <ul className="-mx-4 divide-y divide-gray-100 border-y border-gray-100">
                    {MORE.map(({ to, label, icon: Icon }) => (
                        <li key={to}>
                            <Link to={to} onClick={() => setMoreOpen(false)}
                                className="flex items-center gap-3 px-4 min-h-[48px] text-sm text-gray-700 active:bg-gray-50">
                                <Icon className="w-5 h-5 text-gray-500" />{label}
                            </Link>
                        </li>
                    ))}
                    <li>
                        <button type="button" onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 min-h-[48px] text-sm text-red-600 active:bg-red-50">
                            <LogOut className="w-5 h-5" />Cerrar sesión
                        </button>
                    </li>
                </ul>
            </Modal>
        </>
    )
}

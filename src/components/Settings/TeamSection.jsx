import { useState } from 'react'
import { UserPlus, Trash2, Crown, LogOut, User } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import { useTeam } from '../../hooks/useTeam'

const ROLE_LABEL = { owner: 'Titular', member: 'Miembro', admin: 'Admin', editor: 'Editor', viewer: 'Lector' }

/** "Equipo": accounts that share the same properties, tenants, payments and expenses. */
export default function TeamSection() {
    const { toast, refreshAll } = useApp()
    const team = useTeam()
    const [email, setEmail] = useState('')
    const [busy, setBusy] = useState(false)

    const handleInvite = async (e) => {
        e.preventDefault()
        setBusy(true)
        const { error } = await team.invite(email)
        setBusy(false)
        if (error) return toast.error(error, 6000)
        setEmail('')
        toast.success('Miembro agregado al equipo')
    }

    const handleRemove = async (member, leaving) => {
        const msg = leaving
            ? '¿Salir del equipo? Dejarás de ver los datos del titular.'
            : `¿Quitar a ${member.email} del equipo?`
        if (!window.confirm(msg)) return
        const { error } = await team.remove(member.user_id)
        if (error) return toast.error(error, 6000)
        toast.success(leaving ? 'Saliste del equipo' : 'Miembro eliminado')
        if (leaving) refreshAll()
    }

    if (team.loading) return <p className="text-sm text-gray-500">Cargando equipo...</p>

    if (!team.available) {
        return (
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
                Falta activar la sección Equipo: ejecuta <code className="font-mono text-xs">supabase/migrations/003_workspace_team.sql</code> en
                el SQL Editor de Supabase (proyecto del alquiler) y recarga esta página.
            </div>
        )
    }

    return (
        <div>
            <h3 className="text-[20px] font-bold text-gray-900 mb-1">Equipo</h3>
            <p className="text-sm text-gray-500 mb-4">
                Las cuentas del equipo ven y editan las mismas propiedades, inquilinos, pagos y gastos.
            </p>

            <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
                {team.members.map(m => (
                    <li key={m.user_id} className="flex items-center gap-3 px-4 py-3 text-[15px]">
                        {m.is_owner ? <Crown className="w-4 h-4 text-brand-500 shrink-0" /> : <User className="w-4 h-4 text-gray-400 shrink-0" />}
                        <span className="flex-1 min-w-0 truncate">
                            {m.email}{m.is_me && <span className="text-gray-400"> (tú)</span>}
                        </span>
                        <span className={m.is_owner ? 'wp-badge-amber' : 'wp-badge-green'} style={{ fontSize: 10 }}>
                            {(ROLE_LABEL[m.role] || m.role).toUpperCase()}
                        </span>
                        {team.isOwner && !m.is_owner && (
                            <button onClick={() => handleRemove(m, false)} aria-label={`Quitar ${m.email}`}
                                className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                        )}
                        {!team.isOwner && m.is_me && (
                            <button onClick={() => handleRemove(m, true)} aria-label="Salir del equipo"
                                className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"><LogOut className="w-4 h-4" /></button>
                        )}
                    </li>
                ))}
            </ul>

            {team.isOwner ? (
                <form onSubmit={handleInvite} className="mt-4 flex gap-2">
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                        placeholder="correo de una cuenta ya registrada" aria-label="Correo a agregar"
                        className="accessible-input flex-1 min-w-0" />
                    <button type="submit" disabled={busy}
                        className="flex items-center gap-1.5 px-4 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold disabled:opacity-50">
                        <UserPlus className="w-4 h-4" /> Agregar
                    </button>
                </form>
            ) : (
                <p className="mt-4 text-xs text-gray-500">Solo el titular puede agregar o quitar miembros.</p>
            )}
            {team.isOwner && (
                <p className="mt-2 text-xs text-gray-400">La persona debe tener ya una cuenta en la app (Registro) con ese correo.</p>
            )}
        </div>
    )
}

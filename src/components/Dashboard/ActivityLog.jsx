import { Wallet, DoorOpen, User, Building2, Flame, Zap, Droplets, FileText, Users, ScrollText } from 'lucide-react'
import { formatDistanceToNowStrict, differenceInDays, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { describeActivity } from '../../lib/activityFormat'
import { formatCurrency } from '../../lib/calculations'
import { hasMoney } from '../../lib/paymentStatus'

const ICONS = { payment: Wallet, property: DoorOpen, tenant: User, building: Building2, utility: Flame, team: Users, document: FileText }
const UTILITY_ICONS = { gas: Flame, electricity: Zap, water: Droplets }
const TONE = {
    create: 'bg-green-50 text-green-700',
    update: 'bg-amber-50 text-amber-700',
    delete: 'bg-red-50 text-red-600'
}

const when = (iso) => {
    const d = new Date(iso)
    return differenceInDays(new Date(), d) < 7
        ? formatDistanceToNowStrict(d, { locale: es, addSuffix: true })
        : format(d, "d MMM yyyy, HH:mm", { locale: es })
}

/**
 * "Registro de actividad": latest actions with who and when.
 * Before migration 004 is applied (`available` false) it falls back to the recent payments.
 */
export default function ActivityLog({ entries, available, properties, tenants, buildings, payments }) {
    const context = { properties, tenants, buildings }

    let items
    if (available) {
        items = entries.map(e => {
            const d = describeActivity(e, context)
            const Icon = e.meta?.type && UTILITY_ICONS[e.meta.type] && d.kind === 'utility' ? UTILITY_ICONS[e.meta.type] : ICONS[d.kind]
            return { id: e.id, Icon, tone: d.tone, title: d.title, subtitle: d.subtitle, by: e.actor_email, at: e.created_at }
        })
    } else {
        items = [...payments]
            .filter(p => hasMoney(p) && !p.auto_generated)
            .sort((a, b) => (b.created_at || b.payment_date || '').localeCompare(a.created_at || a.payment_date || ''))
            .slice(0, 12)
            .map(p => {
                const t = tenants.find(x => x.id === p.tenant_id)
                const prop = properties.find(x => x.id === p.property_id)
                return { id: p.id, Icon: Wallet, tone: 'create', title: 'Pago registrado', subtitle: [t?.name, prop?.name, formatCurrency(p.amount_paid)].filter(Boolean).join(' · '), by: null, at: p.created_at || `${p.payment_date}T12:00:00` }
            })
    }

    return (
        <section className="bg-white rounded-xl border border-brand-200 shadow-sm overflow-hidden">
            <header className="px-3 py-2 border-b border-gray-100">
                <h2 className="flex items-center gap-1.5 text-sm font-bold"><ScrollText className="w-4 h-4 text-brand-500" />Registro de actividad</h2>
            </header>
            {!available && (
                <p className="px-3 py-1.5 text-[11px] bg-amber-50 text-amber-800 border-b border-amber-100">
                    Mostrando solo pagos. Ejecuta <code className="font-mono">004_activity_log.sql</code> en Supabase para registrar todas las acciones.
                </p>
            )}
            {items.length === 0 ? (
                <p className="p-6 text-center text-sm text-gray-500">Aún no hay actividad registrada.</p>
            ) : (
                <ul className="divide-y divide-gray-100 max-h-[calc(100vh-330px)] min-h-[260px] overflow-y-auto">
                    {items.map(({ id, Icon, tone, title, subtitle, by, at }) => (
                        <li key={id} className="flex items-start gap-2 px-3 py-2">
                            <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${TONE[tone]}`}><Icon className="w-3.5 h-3.5" /></span>
                            <div className="min-w-0 flex-1 leading-tight">
                                <p className="text-[13px] font-semibold truncate">{title}</p>
                                {subtitle && <p className="text-[11px] text-gray-600 truncate">{subtitle}</p>}
                                <p className="text-[10px] text-gray-400 mt-0.5 truncate">{[by, when(at)].filter(Boolean).join(' · ')}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    )
}

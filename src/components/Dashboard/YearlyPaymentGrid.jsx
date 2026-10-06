import { ChevronLeft, ChevronRight, Check, Lock } from 'lucide-react'
import { format } from 'date-fns'
import { getMonthStatus } from '../../lib/paymentStatus'
import { es } from 'date-fns/locale'

const STYLES = {
    paid: 'bg-green-500 text-white',
    partial: 'bg-amber-400 text-white',
    pending: 'bg-red-500 text-white',
    future: 'bg-gray-100 text-gray-400',
    void: 'bg-gray-200 text-gray-600'
}
const LABELS = { paid: 'Pagado', partial: 'Parcial', pending: 'Pendiente', future: 'Futuro', void: 'Nulo' }
// diagonal stripes for "nulo" months
const VOID_STRIPES = { backgroundImage: 'repeating-linear-gradient(135deg, rgba(0,0,0,.07) 0 4px, transparent 4px 8px)' }

/**
 * Compact 12-month strip.
 * - normal: clicking an unpaid month opens the payment form for it (onMonthClick).
 * - selectMode: unpaid months are ticked (onToggle) to pay several at once.
 * - editMode: every past month without real payments can be ticked (onToggle) to mark it pending / nulo.
 */
export default function YearlyPaymentGrid({ property, payments, year, onYearChange, selectMode = false, editMode = false, selected = [], onToggle, onMonthClick }) {
    return (
        <section>
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold tracking-wide text-gray-500 uppercase">Estado anual</h3>
                <div className="flex items-center gap-1 text-sm font-semibold">
                    <button onClick={() => onYearChange(year - 1)} aria-label="Año anterior" className="p-0.5 rounded hover:bg-gray-100"><ChevronLeft className="w-4 h-4" /></button>
                    <span className="w-10 text-center">{year}</span>
                    <button onClick={() => onYearChange(year + 1)} aria-label="Año siguiente" className="p-0.5 rounded hover:bg-gray-100"><ChevronRight className="w-4 h-4" /></button>
                </div>
            </div>
            <div className="grid grid-cols-6 gap-1.5">
                {Array.from({ length: 12 }, (_, i) => {
                    const m = getMonthStatus(payments, property, year, i)
                    const { key, status } = m
                    const unpaid = status === 'pending' || status === 'partial'
                    const selecting = selectMode || editMode
                    const editable = editMode && status !== 'future' && !m.locked
                    const actionable = editMode ? editable && !!onToggle : (unpaid && (selectMode ? !!onToggle : !!onMonthClick))
                    const isSelected = selecting && selected.includes(key)
                    const name = format(new Date(year, i, 1), 'MMM', { locale: es })
                    let hint = ''
                    if (editMode) hint = m.locked ? ' (tiene pagos registrados: edita o elimina el pago)' : editable ? ' (clic para marcar)' : ''
                    else if (actionable) hint = selectMode ? ' (clic para marcar)' : ' (clic para pagar)'
                    const reason = status === 'void' && m.reason ? ` · ${m.reason}` : ''
                    return (
                        <button
                            key={key}
                            type="button"
                            disabled={!actionable}
                            onClick={() => (selecting ? onToggle(key) : onMonthClick(key))}
                            title={`${name} ${year}: ${LABELS[status]}${reason}${hint}`}
                            aria-pressed={selecting ? isSelected : undefined}
                            style={status === 'void' ? VOID_STRIPES : undefined}
                            className={`relative h-11 rounded-lg flex flex-col items-center justify-center leading-none transition ${STYLES[status]} ${
                                actionable ? 'cursor-pointer hover:brightness-95 hover:scale-[1.04]' : 'cursor-default'} ${
                                isSelected ? 'ring-2 ring-offset-1 ring-ink' : ''} ${
                                editMode && editable && !isSelected ? 'ring-1 ring-ink/30' : ''} ${selectMode && unpaid && !isSelected ? 'ring-1 ring-ink/30' : ''} ${
                                editMode && !editable && status !== 'future' ? 'opacity-60' : ''}`}
                        >
                            <span className="text-[11px] font-bold uppercase">{name}</span>
                            <span className="text-[9px] opacity-90 mt-0.5">{LABELS[status]}</span>
                            {isSelected && <Check className="w-3 h-3 absolute top-0.5 right-0.5" />}
                            {editMode && m.locked && <Lock className="w-2.5 h-2.5 absolute top-0.5 right-0.5 opacity-80" />}
                        </button>
                    )
                })}
            </div>
        </section>
    )
}

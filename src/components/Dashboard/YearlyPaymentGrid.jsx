import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { format } from 'date-fns'
import { getMonthStatus } from '../../lib/paymentStatus'
import { es } from 'date-fns/locale'

const STYLES = {
    paid: 'bg-green-500 text-white',
    partial: 'bg-amber-400 text-white',
    pending: 'bg-red-500 text-white',
    future: 'bg-gray-100 text-gray-400'
}
const LABELS = { paid: 'Pagado', partial: 'Parcial', pending: 'Pendiente', future: 'Futuro' }

/**
 * Compact 12-month strip.
 * - selectMode off: clicking an unpaid month opens the payment form for it (onMonthClick).
 * - selectMode on: unpaid months are ticked (onToggle) to pay several at once.
 */
export default function YearlyPaymentGrid({ property, payments, year, onYearChange, selectMode = false, selected = [], onToggle, onMonthClick }) {
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
                    const { key, status } = getMonthStatus(payments, property, year, i)
                    const unpaid = status === 'pending' || status === 'partial'
                    const actionable = unpaid && (selectMode ? !!onToggle : !!onMonthClick)
                    const isSelected = selectMode && selected.includes(key)
                    const name = format(new Date(year, i, 1), 'MMM', { locale: es })
                    const hint = actionable ? (selectMode ? ' (clic para marcar)' : ' (clic para pagar)') : ''
                    return (
                        <button
                            key={key}
                            type="button"
                            disabled={!actionable}
                            onClick={() => (selectMode ? onToggle(key) : onMonthClick(key))}
                            title={`${name} ${year}: ${LABELS[status]}${hint}`}
                            aria-pressed={selectMode ? isSelected : undefined}
                            className={`relative h-11 rounded-lg flex flex-col items-center justify-center leading-none transition ${STYLES[status]} ${
                                actionable ? 'cursor-pointer hover:brightness-95 hover:scale-[1.04]' : 'cursor-default'} ${
                                isSelected ? 'ring-2 ring-offset-1 ring-ink' : ''} ${selectMode && unpaid && !isSelected ? 'ring-1 ring-ink/30' : ''}`}
                        >
                            <span className="text-[11px] font-bold uppercase">{name}</span>
                            <span className="text-[9px] opacity-90 mt-0.5">{LABELS[status]}</span>
                            {isSelected && <Check className="w-3 h-3 absolute top-0.5 right-0.5" />}
                        </button>
                    )
                })}
            </div>
        </section>
    )
}

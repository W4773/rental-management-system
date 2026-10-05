import { useState } from 'react'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const STYLES = {
    paid: 'bg-green-500 text-white',
    partial: 'bg-amber-400 text-white',
    pending: 'bg-red-500 text-white',
    future: 'bg-gray-100 text-gray-400'
}
const LABELS = { paid: 'Pagado', partial: 'Parcial', pending: 'Pendiente', future: 'Futuro' }

/** Compact 12-month strip. Unpaid months can be ticked to pay several at once. */
export default function YearlyPaymentGrid({ property, payments, year, onYearChange, selected = [], onToggle }) {
    const [hovered, setHovered] = useState(null)
    const today = new Date()

    const getStatus = (monthIndex) => {
        const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}`
        const total = payments
            .filter(p => p.payment_month?.slice(0, 7) === key)
            .reduce((s, p) => s + parseFloat(p.amount_paid || 0), 0)
        const rent = parseFloat(property.monthly_rent)
        if (total > 0) return { key, status: total >= rent - 1 ? 'paid' : 'partial', total }
        const isFuture = year > today.getFullYear() || (year === today.getFullYear() && monthIndex > today.getMonth())
        return { key, status: isFuture ? 'future' : 'pending', total: 0 }
    }

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
                    const { key, status } = getStatus(i)
                    const selectable = onToggle && (status === 'pending' || status === 'partial')
                    const isSelected = selected.includes(key)
                    const name = format(new Date(year, i, 1), 'MMM', { locale: es })
                    return (
                        <button
                            key={key}
                            type="button"
                            disabled={!selectable}
                            onClick={() => onToggle(key)}
                            onMouseEnter={() => setHovered(i)}
                            onMouseLeave={() => setHovered(null)}
                            title={`${name} ${year}: ${LABELS[status]}${selectable ? ' (clic para seleccionar)' : ''}`}
                            aria-pressed={isSelected}
                            className={`relative h-11 rounded-lg flex flex-col items-center justify-center leading-none transition ${STYLES[status]} ${
                                selectable ? 'cursor-pointer hover:brightness-95' : 'cursor-default'} ${
                                isSelected ? 'ring-2 ring-offset-1 ring-ink' : ''} ${hovered === i && selectable ? 'scale-[1.04]' : ''}`}
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

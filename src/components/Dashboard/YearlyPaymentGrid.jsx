import { format, setMonth, startOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'

export default function YearlyPaymentGrid({ property, payments, year }) {
    const months = Array.from({ length: 12 }, (_, i) => i) // 0 to 11

    // Function to determine the status of the month
    const getMonthStatus = (monthIndex) => {
        // Current date check
        const today = new Date()
        const currentYear = today.getFullYear()
        const currentMonth = today.getMonth()

        // 1. Find all payments for this month/year/property
        // Note: payments array passed here is ALREADY filtered by property in parent, but good to be safe if parent changes.
        // Assuming 'payments' prop is all payments for this property.

        const monthPayments = payments.filter(p => {
            // payment_month is 'YYYY-MM-DD'
            if (!p.payment_month) return false
            // IGNORE $0 PAYMENTS - these are placeholders or errors
            if (!p.amount_paid || parseFloat(p.amount_paid) === 0) return false
            // Parse YYYY-MM
            const [pYear, pMonth] = p.payment_month.split('-').map(Number)
            // JS Month is 0-indexed, but split gives 1-12
            return pYear === year && (pMonth - 1) === monthIndex
        })

        if (monthPayments.length > 0) {
            // 2. Sum amounts
            const totalPaid = monthPayments.reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0)
            const targetRent = property.monthly_rent

            // 3. Determine Status
            // If any payment is 'full' OR total >= rent (minus small tolerance)
            const isPaidFull = monthPayments.some(p => p.payment_type === 'full') || (totalPaid >= targetRent - 1)

            if (isPaidFull) return { color: 'bg-status-green', label: 'Pagado' }
            return { color: 'bg-status-yellow', label: 'Parcial' }
        }

        // No payments found logic

        // Future year
        if (year > currentYear) return { color: 'bg-gray-200', label: 'Futuro' }

        // Past year -> Red
        if (year < currentYear) return { color: 'bg-status-red', label: 'Pendiente' }

        // Current year
        // Future month
        if (monthIndex > currentMonth) return { color: 'bg-gray-200', label: 'Futuro' }

        // Current or Past month -> Red
        return { color: 'bg-status-red', label: 'Pendiente' }
    }

    return (
        <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span>📅</span> ESTADO ANUAL {year}
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {months.map(monthIndex => {
                    const status = getMonthStatus(monthIndex)
                    const monthName = format(new Date(year, monthIndex, 1), 'MMM', { locale: es })

                    return (
                        <div
                            key={monthIndex}
                            className={`
                aspect-square rounded-lg flex flex-col items-center justify-center p-2 
                border border-gray-100 shadow-sm transition-all hover:scale-105 cursor-default
                ${status.color} ${status.color.includes('gray') ? 'text-gray-500' : 'text-white'}
              `}
                            title={`${monthName}: ${status.label}`}
                        >
                            <span className="text-xs font-bold uppercase">{monthName}</span>
                            <span className="text-[10px] opacity-90 mt-1">{status.label}</span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

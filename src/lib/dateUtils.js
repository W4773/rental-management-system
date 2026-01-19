import { format, parseISO, startOfMonth, isSameMonth, differenceInMonths } from 'date-fns'
import { es } from 'date-fns/locale'

/**
 * Format a date to display format
 */
export function formatDate(date, formatStr = 'dd/MM/yyyy') {
    if (!date) return ''
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return format(dateObj, formatStr, { locale: es })
}

/**
 * Get first day of month
 */
export function getFirstDayOfMonth(date) {
    return startOfMonth(date)
}

/**
 * Check if two dates are in the same month
 */
export function areSameMonth(date1, date2) {
    if (!date1 || !date2) return false
    const d1 = typeof date1 === 'string' ? parseISO(date1) : date1
    const d2 = typeof date2 === 'string' ? parseISO(date2) : date2
    return isSameMonth(d1, d2)
}

/**
 * Get difference in months between two dates
 */
export function getMonthsDifference(laterDate, earlierDate) {
    const later = typeof laterDate === 'string' ? parseISO(laterDate) : laterDate
    const earlier = typeof earlierDate === 'string' ? parseISO(earlierDate) : earlierDate
    return differenceInMonths(later, earlier)
}

/**
 * Convert date to YYYY-MM-DD format for SQL
 */
export function toSQLDate(date) {
    if (!date) return null
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return format(dateObj, 'yyyy-MM-dd')
}

/**
 * Get month name in Spanish
 */
export function getMonthName(monthNumber) {
    const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ]
    return months[monthNumber - 1] || ''
}

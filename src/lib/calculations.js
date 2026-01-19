import { startOfMonth, subMonths, differenceInMonths } from 'date-fns'

/**
 * Calculate payment status color for a property
 * Rules:
 * - 🟢 GREEN: 0 months overdue (up to date)
 * - 🟡 YELLOW: 1 month overdue
 * - 🔴 RED: 2+ months overdue
 * - ⚫ GRAY: No active tenant
 * 
 * Payment model: Rent is paid one month after (Feb pays for Jan)
 */
export function getPaymentStatusColor(property, activeTenant, payments, currentDate = new Date()) {
    // No active tenant = GRAY
    if (!activeTenant) {
        return {
            color: 'gray',
            emoji: '⚫',
            label: 'Sin inquilino',
            className: 'bg-status-gray-light text-status-gray border-status-gray'
        }
    }

    // Expected payment month = previous month (rent paid one month after)
    const expectedPaymentMonth = startOfMonth(subMonths(currentDate, 1))

    // Check if payment exists and is complete for expected month
    const hasCompletedPayment = payments.some(payment => {
        const paymentMonth = new Date(payment.payment_month)
        return (
            payment.property_id === property.id &&
            paymentMonth.getTime() === expectedPaymentMonth.getTime() &&
            payment.payment_status === 'paid'
        )
    })

    if (hasCompletedPayment) {
        return {
            color: 'green',
            emoji: '🟢',
            label: 'Al día',
            className: 'bg-status-green-light text-status-green border-status-green'
        }
    }

    // Count months overdue
    const monthsOverdue = countMonthsOverdue(property, activeTenant, payments, currentDate)

    if (monthsOverdue === 1) {
        return {
            color: 'yellow',
            emoji: '🟡',
            label: '1 mes atrasado',
            className: 'bg-status-yellow-light text-status-yellow border-status-yellow'
        }
    }

    if (monthsOverdue >= 2) {
        return {
            color: 'red',
            emoji: '🔴',
            label: `${monthsOverdue} meses atrasados`,
            className: 'bg-status-red-light text-status-red border-status-red'
        }
    }

    // Default to green if no issues
    return {
        color: 'green',
        emoji: '🟢',
        label: 'Al día',
        className: 'bg-status-green-light text-status-green border-status-green'
    }
}

/**
 * Count consecutive months without full payment
 */
function countMonthsOverdue(property, tenant, payments, currentDate) {
    let count = 0
    const tenantStartDate = new Date(tenant.start_date)

    // Start from previous month (most recent expected payment)
    let checkMonth = startOfMonth(subMonths(currentDate, 1))

    // Check backwards until we find a paid month or reach tenant start
    while (checkMonth >= tenantStartDate) {
        const hasPaidForMonth = payments.some(payment => {
            const paymentMonth = new Date(payment.payment_month)
            return (
                payment.property_id === property.id &&
                paymentMonth.getTime() === checkMonth.getTime() &&
                payment.payment_status === 'paid'
            )
        })

        if (hasPaidForMonth) {
            break // Found a paid month, stop counting
        }

        count++
        checkMonth = subMonths(checkMonth, 1)
    }

    return count
}

/**
 * Calculate total income received for a specific year
 */
export function calculateYearlyIncome(payments, year) {
    return payments
        .filter(payment => {
            const paymentDate = new Date(payment.payment_month)
            return paymentDate.getFullYear() === year && payment.payment_status === 'paid'
        })
        .reduce((sum, payment) => sum + parseFloat(payment.amount_paid || 0), 0)
}

/**
 * Calculate total pending payments for a specific year
 */
export function calculateYearlyPending(payments, year) {
    return payments
        .filter(payment => {
            const paymentDate = new Date(payment.payment_month)
            return (
                paymentDate.getFullYear() === year &&
                (payment.payment_status === 'pending' || payment.payment_status === 'partial')
            )
        })
        .reduce((sum, payment) => sum + parseFloat(payment.remaining_balance || 0), 0)
}

/**
 * Calculate expected yearly income (monthly_rent × 12 × active properties)
 */
export function calculateExpectedIncome(properties, tenants, year) {
    let total = 0

    properties.forEach(property => {
        // Check if property had an active tenant during the year
        const hadActiveTenant = tenants.some(tenant => {
            if (tenant.property_id !== property.id) return false

            const startDate = new Date(tenant.start_date)
            const endDate = tenant.end_date ? new Date(tenant.end_date) : new Date()

            const yearStart = new Date(year, 0, 1)
            const yearEnd = new Date(year, 11, 31)

            // Check overlap between tenant period and year
            return startDate <= yearEnd && endDate >= yearStart
        })

        if (hadActiveTenant) {
            total += parseFloat(property.monthly_rent) * 12
        }
    })

    return total
}

/**
 * Calculate collection rate (percentage)
 */
export function calculateCollectionRate(income, expected) {
    if (expected === 0) return 0
    return Math.round((income / expected) * 100)
}

/**
 * Format currency (Dominican Pesos)
 */
export function formatCurrency(amount) {
    return new Intl.NumberFormat('es-DO', {
        style: 'currency',
        currency: 'DOP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount || 0)
}

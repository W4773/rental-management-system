/**
 * Validate property name
 */
export function validatePropertyName(name) {
    if (!name || name.trim().length === 0) {
        return 'El nombre es obligatorio'
    }
    if (name.length > 50) {
        return 'El nombre no puede exceder 50 caracteres'
    }
    return null
}

/**
 * Validate monthly rent
 */
export function validateMonthlyRent(rent) {
    const rentNum = parseFloat(rent)
    if (isNaN(rentNum) || rentNum <= 0) {
        return 'El precio debe ser mayor a 0'
    }
    return null
}

/**
 * Validate Dominican cédula format (XXX-XXXXXXX-X)
 */
export function validateCedula(cedula) {
    if (!cedula) {
        return 'La cédula es obligatoria'
    }
    const cedulaRegex = /^\d{3}-\d{7}-\d{1}$/
    if (!cedulaRegex.test(cedula)) {
        return 'Formato de cédula inválido (XXX-XXXXXXX-X)'
    }
    return null
}

/**
 * Validate phone format ((XXX) XXX-XXXX)
 */
export function validatePhone(phone) {
    if (!phone) {
        return 'El teléfono es obligatorio'
    }
    const phoneRegex = /^\(\d{3}\) \d{3}-\d{4}$/
    if (!phoneRegex.test(phone)) {
        return 'Formato de teléfono inválido ((XXX) XXX-XXXX)'
    }
    return null
}

/**
 * Validate email
 */
export function validateEmail(email) {
    if (!email) {
        return null // Email is optional
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
        return 'Formato de email inválido'
    }
    return null
}

/**
 * Validate date is not in the future
 */
export function validateNotFutureDate(date) {
    if (!date) {
        return 'La fecha es obligatoria'
    }
    const dateObj = new Date(date)
    const today = new Date()
    today.setHours(23, 59, 59, 999) // End of today

    if (dateObj > today) {
        return 'La fecha no puede ser futura'
    }
    return null
}

/**
 * Format phone number as user types
 */
export function formatPhoneInput(value) {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '')

    // Format as (XXX) XXX-XXXX
    if (digits.length <= 3) {
        return digits
    } else if (digits.length <= 6) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
    } else {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
    }
}

/**
 * Format cédula as user types
 */
export function formatCedulaInput(value) {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '')

    // Format as XXX-XXXXXXX-X
    if (digits.length <= 3) {
        return digits
    } else if (digits.length <= 10) {
        return `${digits.slice(0, 3)}-${digits.slice(3)}`
    } else {
        return `${digits.slice(0, 3)}-${digits.slice(3, 10)}-${digits.slice(10, 11)}`
    }
}

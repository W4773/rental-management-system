import { formatCurrency } from './calculations'

/** Phone stored as "(809) 555-1234" -> wa.me number (Dominican Republic country code). null if incomplete. */
export function whatsappNumber(phone) {
    const digits = String(phone || '').replace(/\D/g, '')
    if (digits.length === 10) return `1${digits}`
    if (digits.length === 11 && digits.startsWith('1')) return digits
    return null
}

export function letterMessage({ tenant, property, status }) {
    return `Hola ${tenant?.name || ''}, le envío la carta de cobro de ${property?.name || 'su propiedad'}: ${status?.monthsOwed ?? 0} mes(es) pendiente(s), total ${formatCurrency(status?.owedAmount || 0)}. Quedo atento.`
}

export const isPhoneDevice = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '')

/** Phone: system share sheet with the PDF attached (the contact is picked there). */
export const canShareFile = (file) => isPhoneDevice() && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })

export async function shareLetterFile(file, text) {
    try {
        await navigator.share({ files: [file], text, title: file.name })
        return 'shared'
    } catch (err) {
        return err?.name === 'AbortError' ? 'cancelled' : 'failed'
    }
}

/** PC: opens the tenant's chat with the message ready; the downloaded PDF is attached by hand. */
export function openWhatsAppChat(number, text) {
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
}

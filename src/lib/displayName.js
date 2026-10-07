/**
 * Name shown on receipts, reports and letters (header, owner block, signature, watermark):
 * the landlord name from Ajustes → Factura, else the account name, else the email's local part.
 */
export function resolveDisplayName(settings, user) {
    const clean = (v) => (typeof v === 'string' ? v.trim() : '')
    return clean(settings?.landlord_name)
        || clean(user?.user_metadata?.name)
        || clean(user?.email?.split('@')[0])
        || 'Alquiler Pro'
}

/** Up to two initials for the little badge in the report header. */
export function initialsOf(name = '') {
    const parts = name.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return 'AP'
    return (parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[1][0]).toUpperCase()
}

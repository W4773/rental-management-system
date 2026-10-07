/**
 * Name shown on receipts, reports and letters (header, owner block, signature, watermark).
 * Priority: the landlord name from Ajustes → Factura (shared by the whole team); if empty,
 * the account name. Inside a team the fallback is the owner's account (email) for everyone, so
 * two members never print different names.
 * `team` = { ownerEmail, size } from list_workspace_members (optional).
 */
export function resolveDisplayName(settings, user, team = null) {
    const clean = (v) => (typeof v === 'string' ? v.trim() : '')
    const local = (email) => clean(email?.split('@')[0])
    const inTeam = team && team.size > 1 && team.ownerEmail
    return clean(settings?.landlord_name)
        || (inTeam ? local(team.ownerEmail) : '')
        || clean(user?.user_metadata?.name)
        || local(user?.email)
        || 'Alquiler Pro'
}

/** Up to two initials for the little badge in the report header. */
export function initialsOf(name = '') {
    const parts = name.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return 'AP'
    return (parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[1][0]).toUpperCase()
}

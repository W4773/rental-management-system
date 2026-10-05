import { supabase } from './supabase'
import { getEffectiveOwnerId } from './effectiveOwner'

export const ACTIVITY_EVENT = 'activity:logged'

/**
 * Records "who did what" in rental.activity_log (migration 004).
 * Fire-and-forget: it never throws and silently does nothing if the table is not there yet.
 * `meta` should carry name snapshots so the entry still reads well after the entity is deleted.
 */
export async function logActivity({ action, entityType, entityId = null, meta = {} }) {
    try {
        const ownerId = await getEffectiveOwnerId()
        const { data: { session } } = await supabase.auth.getSession()
        const user = session?.user
        if (!ownerId || !user) return
        const { error } = await supabase.from('activity_log').insert([{
            user_id: ownerId,
            actor_id: user.id,
            actor_email: user.email,
            action,
            entity_type: entityType,
            entity_id: entityId ? String(entityId) : null,
            meta
        }])
        if (!error && typeof window !== 'undefined') window.dispatchEvent(new Event(ACTIVITY_EVENT))
    } catch {
        // logging must never break the action being logged
    }
}

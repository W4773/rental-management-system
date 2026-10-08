// Returns the "effective owner" of the workspace the signed-in user belongs to: the workspace owner's id
// for members of a shared workspace, or the user's own id otherwise.
//
// The value is kept in memory AND in localStorage (per user), so writes never have to wait for a
// round-trip (or fail offline); a background check refreshes it. Call clearEffectiveOwnerCache() when
// the user signs out or changes.

import { supabase } from './supabase'

const KEY = 'ap:effective-owner:'
let cachedOwnerId = null
let inflight = null

const read = (uid) => { try { return localStorage.getItem(KEY + uid) } catch { return null } }
const write = (uid, value) => { try { value ? localStorage.setItem(KEY + uid, value) : localStorage.removeItem(KEY + uid) } catch { /* private mode */ } }

async function askServer(uid) {
    const { data, error } = await supabase.rpc('effective_owner_id')
    if (error) throw error
    const owner = data ?? null
    if (owner) { cachedOwnerId = owner; write(uid, owner) }
    return owner
}

export async function getEffectiveOwnerId() {
    if (cachedOwnerId) return cachedOwnerId
    if (inflight) return inflight

    inflight = (async () => {
        let uid = null
        try {
            const { data: { session } } = await supabase.auth.getSession() // local, no network
            uid = session?.user?.id ?? null
            const stored = uid ? read(uid) : null
            if (stored) {
                cachedOwnerId = stored
                askServer(uid).catch(() => {}) // quiet re-check in the background
                return stored
            }
            return await askServer(uid)
        } catch (err) {
            console.warn('effective_owner_id RPC failed, falling back to auth.uid()', err)
            cachedOwnerId = uid // not stored: a later successful check replaces it
            return cachedOwnerId
        } finally {
            inflight = null
        }
    })()

    return inflight
}

export function clearEffectiveOwnerCache(uid = null) {
    cachedOwnerId = null
    inflight = null
    if (uid) write(uid, null)
}

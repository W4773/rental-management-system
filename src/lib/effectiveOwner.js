// src/lib/effectiveOwner.js
// Devuelve el "owner efectivo" del workspace al que pertenece el usuario autenticado.
// Si el usuario es miembro de un workspace compartido, retorna el owner_id del workspace.
// Si no, retorna su propio auth.uid().
//
// El valor se cachea en memoria para evitar round-trips. Llamar a clearEffectiveOwnerCache()
// al cerrar sesión o al cambiar de usuario.

import { supabase } from './supabase'

let cachedOwnerId = null
let inflight = null

export async function getEffectiveOwnerId() {
    if (cachedOwnerId) return cachedOwnerId
    if (inflight) return inflight

    inflight = (async () => {
        try {
            const { data, error } = await supabase.rpc('effective_owner_id')
            if (error) throw error
            cachedOwnerId = data ?? null
        } catch (err) {
            console.warn('effective_owner_id RPC failed, falling back to auth.uid()', err)
            const { data: { user } } = await supabase.auth.getUser()
            cachedOwnerId = user?.id ?? null
        } finally {
            inflight = null
        }
        return cachedOwnerId
    })()

    return inflight
}

export function clearEffectiveOwnerCache() {
    cachedOwnerId = null
    inflight = null
}

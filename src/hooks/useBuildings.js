import { supabase } from '../lib/supabase'
import { useTable, refreshTable, patchTable } from '../lib/dataStore'
import { getEffectiveOwnerId } from '../lib/effectiveOwner'
import { logActivity } from '../lib/activityLog'

// Buildings live in rental.buildings (migration 002). Until it is applied the hook degrades
// to an empty list and `available` is false.
export function useBuildings() {
    const { data: buildings, unavailable } = useTable('buildings')
    const available = !unavailable
    const fetchBuildings = () => refreshTable('buildings')

    async function addBuilding({ name, address }) {
        try {
            const ownerId = await getEffectiveOwnerId()
            if (!ownerId) throw new Error('No autenticado')
            const { data, error } = await supabase
                .from('buildings')
                .insert([{ name, address, user_id: ownerId }])
                .select()
            if (error) throw error
            logActivity({ action: 'building.create', entityType: 'building', entityId: data?.[0]?.id, meta: { name } })
            patchTable('buildings', { upsert: data || [] })
            return { data: data?.[0], error: null }
        } catch (err) {
            return { data: null, error: err.message }
        }
    }

    async function updateBuilding(id, updates) {
        const { data, error } = await supabase.from('buildings').update(updates).eq('id', id).select()
        if (error) return { data: null, error: error.message }
        logActivity({ action: 'building.update', entityType: 'building', entityId: id, meta: { name: updates.name || data?.[0]?.name, fields: Object.keys(updates) } })
        patchTable('buildings', { upsert: data || [] })
        return { data: data?.[0], error: null }
    }

    async function deleteBuilding(id) {
        const { error } = await supabase.from('buildings').delete().eq('id', id)
        if (error) return { error: error.message }
        logActivity({ action: 'building.delete', entityType: 'building', entityId: id, meta: { name: buildings.find(b => b.id === id)?.name } })
        patchTable('buildings', { remove: [id] })
        return { error: null }
    }

    return { buildings, available, addBuilding, updateBuilding, deleteBuilding, refresh: fetchBuildings }
}

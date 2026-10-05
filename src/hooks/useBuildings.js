import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { getEffectiveOwnerId } from '../lib/effectiveOwner'

// Buildings live in rental.buildings (migration 002). Until it is applied the hook degrades
// to an empty list and `available` is false.
export function useBuildings() {
    const [buildings, setBuildings] = useState([])
    const [available, setAvailable] = useState(true)

    const fetchBuildings = useCallback(async () => {
        const { data, error } = await supabase.from('buildings').select('*').order('name')
        if (error) {
            setAvailable(false)
            setBuildings([])
            return
        }
        setAvailable(true)
        setBuildings(data || [])
    }, [])

    useEffect(() => { fetchBuildings() }, [fetchBuildings])

    async function addBuilding({ name, address }) {
        try {
            const ownerId = await getEffectiveOwnerId()
            if (!ownerId) throw new Error('No autenticado')
            const { data, error } = await supabase
                .from('buildings')
                .insert([{ name, address, user_id: ownerId }])
                .select()
            if (error) throw error
            await fetchBuildings()
            return { data: data?.[0], error: null }
        } catch (err) {
            return { data: null, error: err.message }
        }
    }

    async function updateBuilding(id, updates) {
        const { data, error } = await supabase.from('buildings').update(updates).eq('id', id).select()
        if (error) return { data: null, error: error.message }
        await fetchBuildings()
        return { data: data?.[0], error: null }
    }

    async function deleteBuilding(id) {
        const { error } = await supabase.from('buildings').delete().eq('id', id)
        if (error) return { error: error.message }
        await fetchBuildings()
        return { error: null }
    }

    return { buildings, available, addBuilding, updateBuilding, deleteBuilding, refresh: fetchBuildings }
}

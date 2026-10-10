// src/hooks/useUtilityReadings.js
import { useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { friendlyDbError } from '../lib/dbErrors'
import { useTable, refreshTable, patchTable } from '../lib/dataStore'
import { getEffectiveOwnerId } from '../lib/effectiveOwner'
import { logActivity } from '../lib/activityLog'

export function useUtilityReadings(utilityType = null) {
    const { data: allReadings, loading, error } = useTable('gas_consumption')
    // The shared copy holds every type; each screen filters its own
    const readings = useMemo(() => utilityType ? allReadings.filter(r => r.utility_type === utilityType) : allReadings, [allReadings, utilityType])
    const fetchReadings = () => refreshTable('gas_consumption')

    async function addReading(readingData) {
        try {
            const ownerId = await getEffectiveOwnerId()
            if (!ownerId) throw new Error('No autenticado')
            const payload = {
                ...readingData,
                user_id: ownerId,
                utility_type: utilityType || readingData.utility_type || 'gas'
            }
            const { data, error: insertError } = await supabase
                .from('gas_consumption')
                .insert([payload])
                .select()
            if (insertError) throw insertError
            patchTable('gas_consumption', { upsert: data || [] })
            logActivity({ action: 'utility.create', entityType: 'utility', entityId: data?.[0]?.id, meta: { type: payload.utility_type, property_id: payload.property_id, amount: payload.total_cost } })
            return { data: data?.[0], error: null }
        } catch (err) {
            console.error('Error adding utility reading:', err)
            return { data: null, error: friendlyDbError(err, readingData) }
        }
    }

    async function updateReading(id, updates) {
        try {
            const { data, error: updateError } = await supabase
                .from('gas_consumption')
                .update(updates)
                .eq('id', id)
                .select()
            if (updateError) throw updateError
            patchTable('gas_consumption', { upsert: data || [] })
            const known = readings.find(r => r.id === id) || data?.[0]
            logActivity({
                action: updates.paid === true ? 'utility.paid' : 'utility.update',
                entityType: 'utility',
                entityId: id,
                meta: { type: known?.utility_type || 'gas', property_id: known?.property_id, amount: known?.total_cost }
            })
            return { data: data?.[0], error: null }
        } catch (err) {
            return { data: null, error: friendlyDbError(err, updates) }
        }
    }

    async function getLatestReadingForProperty(propertyId) {
        try {
            let query = supabase
                .from('gas_consumption')
                .select('*')
                .eq('property_id', propertyId)
                .order('reading_date', { ascending: false })
                .limit(1)
                .maybeSingle()
            if (utilityType) {
                query = supabase
                    .from('gas_consumption')
                    .select('*')
                    .eq('property_id', propertyId)
                    .eq('utility_type', utilityType)
                    .order('reading_date', { ascending: false })
                    .limit(1)
                    .maybeSingle()
            }
            const { data, error: fetchError } = await query
            if (fetchError) throw fetchError
            return { data, error: null }
        } catch (err) {
            return { data: null, error: err.message }
        }
    }

    async function getReadingsByProperty(propertyId) {
        try {
            let query = supabase
                .from('gas_consumption')
                .select('*')
                .eq('property_id', propertyId)
                .order('reading_date', { ascending: false })
            if (utilityType) query = query.eq('utility_type', utilityType)
            const { data, error: fetchError } = await query
            if (fetchError) throw fetchError
            return { data: data || [], error: null }
        } catch (err) {
            return { data: [], error: err.message }
        }
    }

    return {
        readings,
        gasReadings: readings,      // alias for backwards compatibility with Dashboard.jsx
        loading,
        error,
        addReading,
        addGasReading: addReading,  // alias for backwards compatibility with RegisterGasModal.jsx
        updateReading,
        updateGasReading: updateReading,
        getLatestReadingForProperty,
        getReadingsByProperty,
        refresh: fetchReadings
    }
}

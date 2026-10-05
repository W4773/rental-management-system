// src/hooks/useUtilityReadings.js
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getEffectiveOwnerId } from '../lib/effectiveOwner'

export function useUtilityReadings(utilityType = null) {
    const [readings, setReadings] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        fetchReadings()
        const channel = `utility-${utilityType || 'all'}`
        const subscription = supabase
            .channel(channel)
            .on('postgres_changes',
                { event: '*', schema: 'rental', table: 'gas_consumption' },
                fetchReadings
            )
            .subscribe()
        return () => subscription.unsubscribe()
    }, [utilityType])

    async function fetchReadings() {
        try {
            let query = supabase
                .from('gas_consumption')
                .select('*')
                .order('reading_date', { ascending: false })
            if (utilityType) query = query.eq('utility_type', utilityType)
            const { data, error: fetchError } = await query
            if (fetchError) throw fetchError
            setReadings(data || [])
            setError(null)
        } catch (err) {
            console.error('Error fetching utility readings:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

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
            return { data: data?.[0], error: null }
        } catch (err) {
            console.error('Error adding utility reading:', err)
            return { data: null, error: err.message }
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
            return { data: data?.[0], error: null }
        } catch (err) {
            return { data: null, error: err.message }
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

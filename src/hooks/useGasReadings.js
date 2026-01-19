import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useGasReadings() {
    const [gasReadings, setGasReadings] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        fetchGasReadings()

        // Subscribe to real-time changes
        const subscription = supabase
            .channel('gas-channel')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'gas_consumption' },
                fetchGasReadings
            )
            .subscribe()

        return () => {
            subscription.unsubscribe()
        }
    }, [])

    async function fetchGasReadings() {
        try {
            const { data, error: fetchError } = await supabase
                .from('gas_consumption')
                .select('*')
                .order('reading_date', { ascending: false })

            if (fetchError) throw fetchError
            setGasReadings(data || [])
            setError(null)
        } catch (err) {
            console.error('Error fetching gas readings:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    async function addGasReading(readingData) {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('No autenticado')

            const { data, error: insertError } = await supabase
                .from('gas_consumption')
                .insert([{ ...readingData, user_id: user.id }])
                .select()

            if (insertError) throw insertError
            return { data: data?.[0], error: null }
        } catch (err) {
            console.error('Error adding gas reading:', err)
            return { data: null, error: err.message }
        }
    }

    async function updateGasReading(id, updates) {
        try {
            const { data, error: updateError } = await supabase
                .from('gas_consumption')
                .update(updates)
                .eq('id', id)
                .select()

            if (updateError) throw updateError
            return { data: data?.[0], error: null }
        } catch (err) {
            console.error('Error updating gas reading:', err)
            return { data: null, error: err.message }
        }
    }

    async function getLatestReadingForProperty(propertyId) {
        try {
            const { data, error: fetchError } = await supabase
                .from('gas_consumption')
                .select('*')
                .eq('property_id', propertyId)
                .order('reading_date', { ascending: false })
                .limit(1)
                .maybeSingle()

            if (fetchError) throw fetchError
            return { data, error: null }
        } catch (err) {
            console.error('Error fetching latest gas reading:', err)
            return { data: null, error: err.message }
        }
    }

    async function getReadingsByProperty(propertyId) {
        try {
            const { data, error: fetchError } = await supabase
                .from('gas_consumption')
                .select('*')
                .eq('property_id', propertyId)
                .order('reading_date', { ascending: false })

            if (fetchError) throw fetchError
            return { data: data || [], error: null }
        } catch (err) {
            console.error('Error fetching gas readings for property:', err)
            return { data: [], error: err.message }
        }
    }

    return {
        gasReadings,
        loading,
        error,
        addGasReading,
        updateGasReading,
        getLatestReadingForProperty,
        getReadingsByProperty,
        refresh: fetchGasReadings
    }
}

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useProperties() {
    const [properties, setProperties] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        fetchProperties()

        // Subscribe to real-time changes
        const subscription = supabase
            .channel('properties-channel')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'properties' },
                fetchProperties
            )
            .subscribe()

        return () => {
            subscription.unsubscribe()
        }
    }, [])

    async function fetchProperties() {
        try {
            const { data, error: fetchError } = await supabase
                .from('properties')
                .select('*')
                .order('name')

            if (fetchError) throw fetchError
            setProperties(data || [])
            setError(null)
        } catch (err) {
            console.error('Error fetching properties:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    async function addProperty(propertyData) {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('No autenticado')

            const { data, error: insertError } = await supabase
                .from('properties')
                .insert([{ ...propertyData, user_id: user.id }])
                .select()

            if (insertError) throw insertError
            return { data: data?.[0], error: null }
        } catch (err) {
            console.error('Error adding property:', err)
            return { data: null, error: err.message }
        }
    }

    async function updateProperty(id, updates) {
        try {
            const { data, error: updateError } = await supabase
                .from('properties')
                .update(updates)
                .eq('id', id)
                .select()

            if (updateError) throw updateError
            return { data: data?.[0], error: null }
        } catch (err) {
            console.error('Error updating property:', err)
            return { data: null, error: err.message }
        }
    }

    async function deleteProperty(id) {
        try {
            const { error: deleteError } = await supabase
                .from('properties')
                .delete()
                .eq('id', id)

            if (deleteError) throw deleteError
            return { error: null }
        } catch (err) {
            console.error('Error deleting property:', err)
            return { error: err.message }
        }
    }

    async function getPropertyById(id) {
        try {
            const { data, error: fetchError } = await supabase
                .from('properties')
                .select('*')
                .eq('id', id)
                .single()

            if (fetchError) throw fetchError
            return { data, error: null }
        } catch (err) {
            console.error('Error fetching property:', err)
            return { data: null, error: err.message }
        }
    }

    return {
        properties,
        loading,
        error,
        addProperty,
        updateProperty,
        deleteProperty,
        getPropertyById,
        refresh: fetchProperties
    }
}

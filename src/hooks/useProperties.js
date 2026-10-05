import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getEffectiveOwnerId } from '../lib/effectiveOwner'
import { logActivity } from '../lib/activityLog'

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
                { event: '*', schema: 'rental', table: 'properties' },
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
            const ownerId = await getEffectiveOwnerId()
            if (!ownerId) throw new Error('No autenticado')

            const { data, error: insertError } = await supabase
                .from('properties')
                .insert([{ ...propertyData, user_id: ownerId }])
                .select()

            if (insertError) throw insertError
            logActivity({ action: 'property.create', entityType: 'property', entityId: data?.[0]?.id, meta: { name: propertyData.name, rent: propertyData.monthly_rent } })
            return { data: data?.[0], error: null }
        } catch (err) {
            console.error('Error adding property:', err)
            return { data: null, error: err.message }
        }
    }

    async function updateProperty(id, updates, { silent = false } = {}) {
        try {
            const { data, error: updateError } = await supabase
                .from('properties')
                .update(updates)
                .eq('id', id)
                .select()

            if (updateError) throw updateError
            if (!silent) {
                const name = updates.name || data?.[0]?.name || properties.find(p => p.id === id)?.name
                logActivity({ action: 'property.update', entityType: 'property', entityId: id, meta: { name, fields: Object.keys(updates) } })
            }
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
            logActivity({ action: 'property.delete', entityType: 'property', entityId: id, meta: { name: properties.find(p => p.id === id)?.name } })
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

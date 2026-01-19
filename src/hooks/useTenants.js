import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useTenants() {
    const [tenants, setTenants] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        fetchTenants()

        // Subscribe to real-time changes
        const subscription = supabase
            .channel('tenants-channel')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'tenants' },
                fetchTenants
            )
            .subscribe()

        return () => {
            subscription.unsubscribe()
        }
    }, [])

    async function fetchTenants() {
        try {
            const { data, error: fetchError } = await supabase
                .from('tenants')
                .select('*')
                .order('created_at', { ascending: false })

            if (fetchError) throw fetchError
            setTenants(data || [])
            setError(null)
        } catch (err) {
            console.error('Error fetching tenants:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    async function addTenant(tenantData) {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('No autenticado')

            const { data, error: insertError } = await supabase
                .from('tenants')
                .insert([{ ...tenantData, user_id: user.id }])
                .select()

            if (insertError) throw insertError
            return { data: data?.[0], error: null }
        } catch (err) {
            console.error('Error adding tenant:', err)
            return { data: null, error: err.message }
        }
    }

    async function updateTenant(id, updates) {
        try {
            const { data, error: updateError } = await supabase
                .from('tenants')
                .update(updates)
                .eq('id', id)
                .select()

            if (updateError) throw updateError
            return { data: data?.[0], error: null }
        } catch (err) {
            console.error('Error updating tenant:', err)
            return { data: null, error: err.message }
        }
    }

    async function deleteTenant(id) {
        try {
            const { error: deleteError } = await supabase
                .from('tenants')
                .delete()
                .eq('id', id)

            if (deleteError) throw deleteError
            return { error: null }
        } catch (err) {
            console.error('Error deleting tenant:', err)
            return { error: err.message }
        }
    }

    async function closeTenant(id, endDate = new Date()) {
        return updateTenant(id, { end_date: endDate.toISOString().split('T')[0] })
    }

    async function getActiveTenantForProperty(propertyId) {
        try {
            const { data, error: fetchError } = await supabase
                .from('tenants')
                .select('*')
                .eq('property_id', propertyId)
                .is('end_date', null)
                .limit(1)
                .maybeSingle()

            if (fetchError) throw fetchError
            return { data, error: null }
        } catch (err) {
            console.error('Error fetching active tenant:', err)
            return { data: null, error: err.message }
        }
    }

    async function getTenantsByProperty(propertyId) {
        try {
            const { data, error: fetchError } = await supabase
                .from('tenants')
                .select('*')
                .eq('property_id', propertyId)
                .order('start_date', { ascending: false })

            if (fetchError) throw fetchError
            return { data: data || [], error: null }
        } catch (err) {
            console.error('Error fetching tenants for property:', err)
            return { data: [], error: err.message }
        }
    }

    return {
        tenants,
        loading,
        error,
        addTenant,
        updateTenant,
        deleteTenant,
        closeTenant,
        getActiveTenantForProperty,
        getTenantsByProperty,
        refresh: fetchTenants
    }
}

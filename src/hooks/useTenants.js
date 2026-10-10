import { supabase } from '../lib/supabase'
import { friendlyDbError } from '../lib/dbErrors'
import { useTable, refreshTable, patchTable, getTableState } from '../lib/dataStore'
import { getEffectiveOwnerId } from '../lib/effectiveOwner'
import { logActivity } from '../lib/activityLog'

export function useTenants() {
    const { data: tenants, loading, error } = useTable('tenants')
    const fetchTenants = () => refreshTable('tenants')

    async function addTenant(tenantData) {
        try {
            const ownerId = await getEffectiveOwnerId()
            if (!ownerId) throw new Error('No autenticado')

            const { data, error: insertError } = await supabase
                .from('tenants')
                .insert([{ ...tenantData, user_id: ownerId }])
                .select()

            if (insertError) throw insertError
            patchTable('tenants', { upsert: data || [] })
            logActivity({ action: 'tenant.assign', entityType: 'tenant', entityId: data?.[0]?.id, meta: { name: tenantData.name, property_id: tenantData.property_id } })
            return { data: data?.[0], error: null }
        } catch (err) {
            console.error('Error adding tenant:', err)
            return { data: null, error: friendlyDbError(err, tenantData) }
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
            patchTable('tenants', { upsert: data || [] })
            const known = tenants.find(t => t.id === id) || data?.[0]
            logActivity({
                action: updates.end_date ? 'tenant.unassign' : 'tenant.update',
                entityType: 'tenant',
                entityId: id,
                meta: { name: updates.name || known?.name, property_id: known?.property_id }
            })
            return { data: data?.[0], error: null }
        } catch (err) {
            console.error('Error updating tenant:', err)
            return { data: null, error: friendlyDbError(err, updates) }
        }
    }

    async function deleteTenant(id) {
        try {
            const { error: deleteError } = await supabase
                .from('tenants')
                .delete()
                .eq('id', id)

            if (deleteError) throw deleteError
            patchTable('tenants', { remove: [id] })
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
        // The shared copy is kept live; only fall back to the network if it has not loaded yet
        const local = getTableState('tenants')
        if (!local.loading || local.data.length > 0) {
            return { data: local.data.find(t => t.property_id === propertyId && !t.end_date) || null, error: null }
        }
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

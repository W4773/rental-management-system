import { supabase } from './supabase'

/**
 * Export all data as JSON backup
 */
export async function exportDataAsJSON() {
    try {
        // Fetch all data from Supabase
        const [properties, tenants, payments, gas] = await Promise.all([
            supabase.from('properties').select('*'),
            supabase.from('tenants').select('*'),
            supabase.from('rent_payments').select('*'),
            supabase.from('gas_consumption').select('*')
        ])

        const backup = {
            version: "1.0",
            exported_at: new Date().toISOString(),
            data: {
                properties: properties.data || [],
                tenants: tenants.data || [],
                rent_payments: payments.data || [],
                gas_consumption: gas.data || []
            }
        }

        // Create JSON file and download
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `rental-backup-${Date.now()}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        return { success: true }
    } catch (error) {
        console.error('Error exporting backup:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Import data from JSON backup
 */
export async function importDataFromJSON(file) {
    try {
        // Read file
        const text = await file.text()
        const backup = JSON.parse(text)

        // Validate version
        if (backup.version !== "1.0") {
            throw new Error('Versión de backup no compatible')
        }

        // Clear existing data (CASCADE will handle related records)
        // Use a dummy ID that will never exist to delete all records
        await supabase.from('properties').delete().neq('id', '00000000-0000-0000-0000-000000000000')

        // Insert data (order matters due to foreign keys)
        if (backup.data.properties.length > 0) {
            const { error: propsError } = await supabase.from('properties').insert(backup.data.properties)
            if (propsError) throw propsError
        }

        if (backup.data.tenants.length > 0) {
            const { error: tenantsError } = await supabase.from('tenants').insert(backup.data.tenants)
            if (tenantsError) throw tenantsError
        }

        if (backup.data.rent_payments.length > 0) {
            const { error: paymentsError } = await supabase.from('rent_payments').insert(backup.data.rent_payments)
            if (paymentsError) throw paymentsError
        }

        if (backup.data.gas_consumption.length > 0) {
            const { error: gasError } = await supabase.from('gas_consumption').insert(backup.data.gas_consumption)
            if (gasError) throw gasError
        }

        return { success: true }
    } catch (error) {
        console.error('Error importing backup:', error)
        return { success: false, error: error.message }
    }
}

import { markHistoryHandled } from './historyLock'

/**
 * Creates a tenant for a property and its generated paid history (months before the last two).
 * Shared by "Asignar inquilino" and the optional tenant section of "Registrar propiedad".
 * `hooks` = { addTenant, generateHistoricalPayments } from useTenants / usePayments.
 */
export async function createTenantWithHistory({ addTenant, generateHistoricalPayments }, { propertyId, monthlyRent, property = null, values }) {
    const deposit = parseFloat(values.deposit_amount)
    const { data: tenant, error } = await addTenant({
        property_id: propertyId,
        name: values.name.trim(),
        identity_number: values.identity_number,
        phone: values.phone,
        email: (values.email || '').trim() || null,
        start_date: values.start_date,
        end_date: null,
        ...(deposit > 0 ? { deposit_amount: deposit } : {})
    })
    if (error) return { data: null, error }
    markHistoryHandled(tenant.id) // the background back-fill must not generate the same months
    await generateHistoricalPayments(propertyId, tenant.id, values.start_date, property || monthlyRent)
    return { data: tenant, error: null }
}

/** Friendly message when the deposit column (migration 007) is not there yet. */
export const depositColumnMissing = (message = '') => /deposit_amount/i.test(message)
export const DEPOSIT_MIGRATION_MESSAGE = 'Falta ejecutar supabase/migrations/007_tenant_deposit.sql en Supabase (esquema rental) para guardar el depósito.'

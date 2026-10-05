import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getEffectiveOwnerId } from '../lib/effectiveOwner'
import { logActivity } from '../lib/activityLog'

export function usePayments() {
    const [payments, setPayments] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        fetchPayments()

        // Subscribe to real-time changes
        const subscription = supabase
            .channel('payments-channel')
            .on('postgres_changes',
                { event: '*', schema: 'rental', table: 'rent_payments' },
                fetchPayments
            )
            .subscribe()

        return () => {
            subscription.unsubscribe()
        }
    }, [])

    async function fetchPayments() {
        try {
            const { data, error: fetchError } = await supabase
                .from('rent_payments')
                .select('*')
                .order('payment_month', { ascending: false })

            if (fetchError) throw fetchError
            setPayments(data || [])
            setError(null)
        } catch (err) {
            console.error('Error fetching payments:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    // `silent`: the caller logs its own (aggregated) activity entry, e.g. paying several months at once
    async function addPayment(paymentData, { silent = false } = {}) {
        try {
            const ownerId = await getEffectiveOwnerId()
            if (!ownerId) throw new Error('No autenticado')

            const { data, error: insertError } = await supabase
                .from('rent_payments')
                .insert([{ ...paymentData, user_id: ownerId }])
                .select()

            if (insertError) throw insertError
            if (!silent && parseFloat(paymentData.amount_paid) > 0) {
                logActivity({ action: 'payment.create', entityType: 'payment', entityId: data?.[0]?.id, meta: { property_id: paymentData.property_id, tenant_id: paymentData.tenant_id, months: [paymentData.payment_month?.slice(0, 7)], amount: paymentData.amount_paid } })
            }
            return { data: data?.[0], error: null }
        } catch (err) {
            console.error('Error adding payment:', err)
            return { data: null, error: err.message }
        }
    }

    async function updatePayment(id, updates) {
        try {
            const { data, error: updateError } = await supabase
                .from('rent_payments')
                .update(updates)
                .eq('id', id)
                .select()

            if (updateError) throw updateError
            return { data: data?.[0], error: null }
        } catch (err) {
            console.error('Error updating payment:', err)
            return { data: null, error: err.message }
        }
    }

    async function deletePayment(id) {
        try {
            const { error: deleteError } = await supabase
                .from('rent_payments')
                .delete()
                .eq('id', id)

            if (deleteError) throw deleteError
            const old = payments.find(p => p.id === id)
            logActivity({ action: 'payment.delete', entityType: 'payment', entityId: id, meta: { property_id: old?.property_id, tenant_id: old?.tenant_id, months: [old?.payment_month?.slice(0, 7)], amount: old?.amount_paid } })
            return { error: null }
        } catch (err) {
            console.error('Error deleting payment:', err)
            return { error: err.message }
        }
    }

    async function getPaymentsByProperty(propertyId) {
        try {
            const { data, error: fetchError } = await supabase
                .from('rent_payments')
                .select('*')
                .eq('property_id', propertyId)
                .order('payment_month', { ascending: false })

            if (fetchError) throw fetchError
            return { data: data || [], error: null }
        } catch (err) {
            console.error('Error fetching payments for property:', err)
            return { data: [], error: err.message }
        }
    }

    async function getPaymentsByYear(year) {
        try {
            const { data, error: fetchError } = await supabase
                .from('rent_payments')
                .select('*')
                .gte('payment_month', `${year}-01-01`)
                .lte('payment_month', `${year}-12-31`)
                .order('payment_month', { ascending: false })

            if (fetchError) throw fetchError
            return { data: data || [], error: null }
        } catch (err) {
            console.error('Error fetching payments for year:', err)
            return { data: [], error: err.message }
        }
    }

    async function generateHistoricalPayments(propertyId, tenantId, startDate, rentAmount) {
        try {
            const ownerId = await getEffectiveOwnerId()
            if (!ownerId) throw new Error('No autenticado')

            const today = new Date()
            const prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)

            const start = new Date(startDate)
            start.setDate(1)
            start.setHours(0, 0, 0, 0)

            const records = []
            const cursor = new Date(start)

            while (cursor < prevMonthStart) {
                const y = cursor.getFullYear()
                const m = String(cursor.getMonth() + 1).padStart(2, '0')
                records.push({
                    property_id: propertyId,
                    tenant_id: tenantId,
                    payment_month: `${y}-${m}-01`,
                    rent_amount: rentAmount,
                    amount_paid: rentAmount,
                    remaining_balance: 0,
                    payment_date: `${y}-${m}-01`,
                    payment_method: 'historical',
                    payment_type: 'full',
                    payment_status: 'paid',
                    auto_generated: true,
                    user_id: ownerId,
                    notes: 'Generado automáticamente al registrar'
                })
                cursor.setMonth(cursor.getMonth() + 1)
            }

            if (records.length === 0) return { data: [], error: null }

            const { data, error: insertError } = await supabase
                .from('rent_payments')
                .insert(records)
                .select()

            if (insertError) throw insertError
            return { data: data || [], error: null }
        } catch (err) {
            console.error('Error generating historical payments:', err)
            return { data: [], error: err.message }
        }
    }

    return {
        payments,
        loading,
        error,
        addPayment,
        updatePayment,
        deletePayment,
        getPaymentsByProperty,
        getPaymentsByYear,
        generateHistoricalPayments,
        refresh: fetchPayments
    }
}

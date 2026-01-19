import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

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
                { event: '*', schema: 'public', table: 'rent_payments' },
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

    async function addPayment(paymentData) {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('No autenticado')

            const { data, error: insertError } = await supabase
                .from('rent_payments')
                .insert([{ ...paymentData, user_id: user.id }])
                .select()

            if (insertError) throw insertError
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

    return {
        payments,
        loading,
        error,
        addPayment,
        updatePayment,
        deletePayment,
        getPaymentsByProperty,
        getPaymentsByYear,
        refresh: fetchPayments
    }
}

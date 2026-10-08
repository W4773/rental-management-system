import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { getEffectiveOwnerId } from '../lib/effectiveOwner'
import { getTableState, patchTable } from '../lib/dataStore'
import { getNetworkState } from '../lib/networkStatus'
import { rentForMonth } from '../lib/rentHistory'
import { newId } from '../lib/outbox'

/**
 * Tenants who started before last month and have no payment rows at all before it get their old
 * months generated as paid (history). It is a background task that runs once per tenant, only
 * when the data on screen comes from the server (never from the offline cache) and we are online,
 * so it can never duplicate rows or write from stale data.
 */
export function useHistoryBackfill({ properties, tenants, payments }) {
    const done = useRef(new Set())
    const busy = useRef(false)

    useEffect(() => {
        const fresh = ['properties', 'tenants', 'rent_payments'].every(n => {
            const s = getTableState(n)
            return s.fetchedAt && !s.fromCache && !s.loading
        })
        if (!fresh || busy.current || !getNetworkState().online) return

        const today = new Date()
        const prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        const todo = tenants.filter(t => !t.end_date && !done.current.has(t.id)).filter(t => {
            const start = new Date(t.start_date); start.setDate(1); start.setHours(0, 0, 0, 0)
            return start < prevMonthStart && !payments.some(p => p.tenant_id === t.id && new Date(p.payment_month) < prevMonthStart)
        })
        if (todo.length === 0) return

        busy.current = true
        ;(async () => {
            try {
                const ownerId = await getEffectiveOwnerId()
                if (!ownerId) return
                const records = []
                for (const tenant of todo) {
                    done.current.add(tenant.id)
                    const property = properties.find(p => p.id === tenant.property_id)
                    if (!property) continue
                    const cursor = new Date(tenant.start_date); cursor.setDate(1); cursor.setHours(0, 0, 0, 0)
                    while (cursor < prevMonthStart) {
                        const y = cursor.getFullYear()
                        const m = String(cursor.getMonth() + 1).padStart(2, '0')
                        const rent = rentForMonth(property, `${y}-${m}`)
                        records.push({
                            id: newId(), property_id: tenant.property_id, tenant_id: tenant.id, payment_month: `${y}-${m}-01`,
                            rent_amount: rent, amount_paid: rent, remaining_balance: 0, payment_date: `${y}-${m}-01`,
                            payment_method: 'historical', payment_type: 'full', payment_status: 'paid', auto_generated: true,
                            user_id: ownerId, notes: 'Generado automáticamente (backfill)'
                        })
                        cursor.setMonth(cursor.getMonth() + 1)
                    }
                }
                if (records.length === 0) return
                const { data, error } = await supabase.from('rent_payments').insert(records).select()
                if (!error && data) patchTable('rent_payments', { upsert: data })
            } catch (err) {
                console.warn('History backfill skipped:', err.message)
            } finally {
                busy.current = false
            }
        })()
    }, [properties, tenants, payments])
}

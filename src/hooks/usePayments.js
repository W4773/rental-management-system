import { supabase } from '../lib/supabase'
import { friendlyDbError } from '../lib/dbErrors'
import { logError } from '../lib/errorLog'
import { useTable, refreshTable, patchTable } from '../lib/dataStore'
import { getNetworkState, OFFLINE_MESSAGE } from '../lib/networkStatus'
import { newId, enqueuePayment, isNetworkError } from '../lib/outbox'
import { getEffectiveOwnerId } from '../lib/effectiveOwner'
import { logActivity } from '../lib/activityLog'
import { monthKeyOf, hasMoney } from '../lib/paymentStatus'
import { rentForMonth } from '../lib/rentHistory'

const REQUEST_TIMEOUT_MS = 15000

/** A request that never answers becomes a visible error instead of a silent freeze. */
function withTimeout(promise, ms = REQUEST_TIMEOUT_MS) {
    let timer
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('La solicitud tardó demasiado en responder. Revisa tu conexión e inténtalo de nuevo.')), ms)
    })
    return Promise.race([Promise.resolve(promise), timeout]).finally(() => clearTimeout(timer))
}

/** Runs a Supabase call with a time limit; on a timeout it refreshes the session once and retries. */
async function guarded(makeRequest) {
    if (!getNetworkState().online) throw new Error(OFFLINE_MESSAGE) // answer at once instead of waiting on a dead connection
    try {
        return await withTimeout(makeRequest())
    } catch (err) {
        if (!/tardó demasiado/.test(err.message)) throw err
        try { await withTimeout(supabase.auth.getSession(), 5000) } catch { /* retry anyway */ }
        return await withTimeout(makeRequest())
    }
}

/** All rent_payments rows of one property, read straight from the database. */
async function fetchPropertyRows(propertyId) {
    const { data, error } = await guarded(() => supabase.from('rent_payments').select('*').eq('property_id', propertyId))
    if (error) throw error
    return data || []
}

export function usePayments() {
    // One shared, cached copy of the table (see lib/dataStore.js)
    const { data: payments, loading, error } = useTable('rent_payments')
    const fetchPayments = () => refreshTable('rent_payments')

    // `silent`: the caller logs its own (aggregated) activity entry, e.g. paying several months at once.
    // Works without a connection: the payment gets its id here, is queued, shows up at once marked as
    // pending, and is sent when the connection is back (a repeated send is harmless thanks to the id).
    async function addPayment(paymentData, { silent = false } = {}) {
        try {
            const ownerId = await getEffectiveOwnerId()
            if (!ownerId) throw new Error('No autenticado')

            const row = { ...paymentData, id: paymentData.id || newId(), user_id: ownerId }
            const activity = (!silent && parseFloat(paymentData.amount_paid) > 0)
                ? { action: 'payment.create', entityType: 'payment', entityId: row.id, meta: { property_id: paymentData.property_id, tenant_id: paymentData.tenant_id, months: [paymentData.payment_month?.slice(0, 7)], amount: paymentData.amount_paid } }
                : null

            if (!getNetworkState().online) return { data: await enqueuePayment(row), error: null, queued: true }

            const { data, error: insertError } = await supabase.from('rent_payments').insert([row]).select()
            if (insertError) {
                if (isNetworkError(insertError)) return { data: await enqueuePayment(row), error: null, queued: true }
                throw insertError
            }
            patchTable('rent_payments', { upsert: data || [] })
            if (activity) logActivity(activity)
            return { data: data?.[0], error: null }
        } catch (err) {
            console.error('Error adding payment:', err)
            return { data: null, error: friendlyDbError(err, paymentData) }
        }
    }

    async function updatePayment(id, updates, { silent = false } = {}) {
        try {
            const { data, error: updateError } = await supabase
                .from('rent_payments')
                .update(updates)
                .eq('id', id)
                .select()

            if (updateError) throw updateError
            patchTable('rent_payments', { upsert: data || [] })
            if (!silent) {
                const row = data?.[0] || payments.find(p => p.id === id)
                logActivity({ action: 'payment.update', entityType: 'payment', entityId: id, meta: { property_id: row?.property_id, tenant_id: row?.tenant_id, months: [monthKeyOf(row)], amount: row?.amount_paid } })
            }
            return { data: data?.[0], error: null }
        } catch (err) {
            console.error('Error updating payment:', err)
            return { data: null, error: friendlyDbError(err, updates) }
        }
    }

    async function deletePayment(id) {
        try {
            const { error: deleteError } = await supabase
                .from('rent_payments')
                .delete()
                .eq('id', id)

            if (deleteError) throw deleteError
            patchTable('rent_payments', { remove: [id] })
            const old = payments.find(p => p.id === id)
            logActivity({ action: 'payment.delete', entityType: 'payment', entityId: id, meta: { property_id: old?.property_id, tenant_id: old?.tenant_id, months: [old?.payment_month?.slice(0, 7)], amount: old?.amount_paid } })
            return { error: null }
        } catch (err) {
            console.error('Error deleting payment:', err)
            return { error: err.message }
        }
    }

    /**
     * Marks months of a property as owed ('pending') or not charged ('void' = "nulo").
     * Months with real payments are skipped and reported. It works on what is in the database right
     * now (not on possibly stale screen state), converts existing rows IN PLACE (no delete needed),
     * inserts rows only for months with none, checks how many rows were really affected and re-reads
     * to verify, and gives up with a visible error instead of hanging. Explicit rows (not just "no row")
     * are needed so the metrics back-fill does not turn old months back into "paid".
     */
    async function setMonthsState(property, tenant, monthKeys, state, { reason = '' } = {}) {
        try {
            const ownerId = await getEffectiveOwnerId()
            if (!ownerId) throw new Error('No autenticado')

            const fresh = await fetchPropertyRows(property.id)
            const skipped = []
            const done = []
            const updates = [] // { ids, payload }
            const inserts = []

            for (const key of monthKeys) {
                const rows = fresh.filter(p => monthKeyOf(p) === key)
                if (rows.some(p => hasMoney(p) && !p.auto_generated)) { skipped.push(key); continue }
                done.push(key)
                const rent = rows[0]?.rent_amount ? parseFloat(rows[0].rent_amount) : rentForMonth(property, key)
                const mark = {
                    rent_amount: rent,
                    amount_paid: 0,
                    remaining_balance: rent,
                    payment_type: 'full',
                    payment_status: 'pending',
                    auto_generated: false,
                    notes: state === 'void' ? (reason ? `Nulo: ${reason}` : 'Nulo') : 'Marcado como pendiente',
                    voided: state === 'void',
                    void_reason: state === 'void' ? (reason || null) : null
                }
                // `voided` columns only travel when needed, so "pendiente" works before migration 006
                if (state !== 'void') { delete mark.voided; delete mark.void_reason }
                if (rows.length > 0) {
                    updates.push({ ids: rows.map(r => r.id), payload: state !== 'void' && rows.some(r => r.voided) ? { ...mark, voided: false, void_reason: null } : mark })
                } else {
                    inserts.push({
                        ...mark,
                        property_id: property.id,
                        tenant_id: tenant.id,
                        payment_month: `${key}-01`,
                        // The table requires a date and a known method even for unpaid rows
                        payment_date: `${key}-01`,
                        payment_method: 'historical',
                        user_id: ownerId
                    })
                }
            }

            const written = [] // rows the database answered with, kept as evidence if the check below fails
            for (const { ids, payload } of updates) {
                const { data, error } = await guarded(() => supabase.from('rent_payments').update(payload).in('id', ids).select('*'))
                if (error) throw error
                if ((data || []).length !== ids.length) throw new Error(`La base de datos solo actualizó ${(data || []).length} de ${ids.length} registros (revisa los permisos).`)
                written.push(...data)
                patchTable('rent_payments', { upsert: data })
            }
            if (inserts.length > 0) {
                const { data, error } = await guarded(() => supabase.from('rent_payments').insert(inserts).select('*'))
                if (error) throw error
                if ((data || []).length !== inserts.length) throw new Error(`La base de datos solo guardó ${(data || []).length} de ${inserts.length} meses (revisa los permisos).`)
                written.push(...data)
                patchTable('rent_payments', { upsert: data })
            }

            // Verify what is stored now
            if (done.length > 0) {
                const notApplied = (rowsNow) => done.filter(key => {
                    const rows = rowsNow.filter(p => monthKeyOf(p) === key)
                    return rows.length === 0 || rows.some(p => hasMoney(p)) || (state === 'void' && !rows.some(p => p.voided))
                })
                let after = await fetchPropertyRows(property.id)
                let wrong = notApplied(after)
                if (wrong.length > 0) { // one more look in case the read raced the write
                    await new Promise(r => setTimeout(r, 700))
                    after = await fetchPropertyRows(property.id)
                    wrong = notApplied(after)
                }
                if (wrong.length > 0) {
                    const brief = (p) => ({ id: p.id, month: p.payment_month, amount_paid: p.amount_paid, remaining_balance: p.remaining_balance, rent_amount: p.rent_amount, payment_status: p.payment_status, payment_type: p.payment_type, payment_method: p.payment_method, auto_generated: p.auto_generated, voided: p.voided, tenant_id: p.tenant_id })
                    logError({
                        source: 'app', message: `Marcar ${state === 'void' ? 'nulo' : 'pendiente'}: la base no refleja el cambio en ${wrong.join(', ')}`,
                        context: {
                            state, months: wrong, property_id: property.id, tenant_id: tenant.id,
                            sent: [...updates.map(u => ({ ids: u.ids, payload: u.payload })), ...inserts.map(i => ({ insert: i.payment_month }))],
                            answered: written.filter(r => wrong.includes(monthKeyOf(r))).map(brief),
                            storedNow: after.filter(r => wrong.includes(monthKeyOf(r))).map(brief)
                        }
                    })
                }
                if (wrong.length > 0) {
                    // What the database holds right now, so the message itself is usable as evidence
                    const seen = wrong.map(key => {
                        const rows = after.filter(p => monthKeyOf(p) === key)
                        const sent = written.filter(r => monthKeyOf(r) === key)
                        return `${key}: ` + (rows.length === 0 ? 'sin filas' : rows.map(r => `monto ${r.amount_paid}, ${r.payment_status}, ${r.auto_generated ? 'auto' : 'real'}, ${r.payment_method}`).join(' | ')) + ` [la base respondió ${sent.length} fila(s) al guardar${sent[0] ? `: monto ${sent[0].amount_paid}` : ''}]`
                    })
                    throw new Error(`No se aplicó el cambio en ${wrong.length} mes(es): ${wrong.join(', ')}. Recarga e inténtalo de nuevo. Detalle: ${seen.join(' ; ')}`)
                }
                logActivity({
                    action: state === 'void' ? 'payment.void' : 'payment.pending',
                    entityType: 'payment',
                    entityId: property.id,
                    meta: { property_id: property.id, tenant_id: tenant.id, months: done, reason: reason || undefined }
                })
            }
            return { done, skipped, error: null }
        } catch (err) {
            console.error('Error marking months:', err)
            await fetchPayments().catch(() => {})
            return { done: [], skipped: [], error: err.message }
        }
    }

    /** Removes the explicit pending / void rows of those months (they go back to "no record" = owed). */
    async function clearMonthMarks(property, monthKeys) {
        try {
            const fresh = await fetchPropertyRows(property.id)
            const ids = fresh
                .filter(p => monthKeys.includes(monthKeyOf(p)) && !hasMoney(p) && !p.auto_generated)
                .map(p => p.id)
            if (ids.length > 0) {
                const { data, error } = await guarded(() => supabase.from('rent_payments').delete().in('id', ids).select('id'))
                if (error) throw error
                if ((data || []).length !== ids.length) throw new Error(`La base de datos solo quitó ${(data || []).length} de ${ids.length} marcas (revisa los permisos).`)
                patchTable('rent_payments', { remove: ids })
                logActivity({ action: 'payment.unmark', entityType: 'payment', entityId: property.id, meta: { property_id: property.id, months: monthKeys } })
            }
            return { count: ids.length, error: null }
        } catch (err) {
            console.error('Error clearing marks:', err)
            return { count: 0, error: err.message }
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
            // `rentAmount` is a number or the property itself (then each month uses the price in force then)
            const monthRent = (key) => (rentAmount && typeof rentAmount === 'object') ? rentForMonth(rentAmount, key) : rentAmount

            while (cursor < prevMonthStart) {
                const y = cursor.getFullYear()
                const m = String(cursor.getMonth() + 1).padStart(2, '0')
                records.push({
                    property_id: propertyId,
                    tenant_id: tenantId,
                    payment_month: `${y}-${m}-01`,
                    rent_amount: monthRent(`${y}-${m}`),
                    amount_paid: monthRent(`${y}-${m}`),
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
            patchTable('rent_payments', { upsert: data || [] })
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
        setMonthsState,
        clearMonthMarks,
        deletePayment,
        getPaymentsByProperty,
        getPaymentsByYear,
        generateHistoricalPayments,
        refresh: fetchPayments
    }
}

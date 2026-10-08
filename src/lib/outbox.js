import { supabase } from './supabase'
import { cacheGet, cacheSet } from './localCache'
import { patchTable, refreshTable } from './dataStore'
import { getNetworkState, setPendingChanges, setSyncing, NETWORK_RESTORED } from './networkStatus'

/**
 * Changes made without a connection. Today: new rent payments (and the activity entries about
 * them). Every queued row carries a client-made id, so sending it twice is harmless: a duplicate
 * key answer means "already saved".
 *
 * item = { qid, kind: 'payment' | 'activity', table, row, createdAt, attempts, status, lastError }
 */
let items = []
let loadedFor = null
let timer = null
let running = false
const listeners = new Set()

export const newId = () => (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16) })

export const NETWORK_ERROR = /Sin conexión|Failed to fetch|NetworkError|Load failed|TimeoutError|AbortError|tardó demasiado|network|offline|ERR_INTERNET/i
/** An error from supabase-js that comes from the connection (no HTTP/database code). */
export const isNetworkError = (err) => {
    const message = typeof err === 'string' ? err : err?.message || ''
    const code = typeof err === 'object' ? err?.code : ''
    return !code && NETWORK_ERROR.test(message)
}
const isDuplicate = (err) => err?.code === '23505' || /duplicate key/i.test(err?.message || '')

const emit = () => { setPendingChanges(items.filter(i => i.kind === 'payment').length); listeners.forEach(l => l(items)) }
export const subscribeOutbox = (l) => { listeners.add(l); return () => listeners.delete(l) }
export const getOutbox = () => items

async function userKey() {
    const { data } = await supabase.auth.getSession()
    return data?.session?.user?.id || null
}
const storageKey = (uid) => `u:${uid}:outbox`
async function save() {
    const uid = await userKey()
    if (uid) await cacheSet(storageKey(uid), items)
}

/** Loads the saved queue (after a reload) and shows its payments again as "pending". */
export async function startOutbox() {
    const uid = await userKey()
    if (!uid) return
    if (loadedFor !== uid) {
        loadedFor = uid
        items = (await cacheGet(storageKey(uid))) || []
        emit()
    }
    patchTable('rent_payments', { upsert: items.filter(i => i.kind === 'payment' && i.status !== 'done').map(i => ({ ...i.row, _pending: true })) })
    schedule()
    syncOutbox()
}

export function stopOutbox() {
    clearTimeout(timer)
    timer = null
    items = []
    loadedFor = null
    emit()
}

function schedule() {
    clearTimeout(timer)
    if (items.length === 0) { timer = null; return }
    timer = setTimeout(() => { syncOutbox() }, 15000)
}

/** Adds a payment row to the queue and shows it at once. */
export async function enqueuePayment(row, { activity = null } = {}) {
    items.push({ qid: newId(), kind: 'payment', table: 'rent_payments', row, createdAt: Date.now(), attempts: 0, status: 'queued', lastError: null })
    if (activity) enqueueActivity(activity, false)
    patchTable('rent_payments', { upsert: [{ ...row, _pending: true }] })
    emit()
    await save()
    schedule()
    return { ...row, _pending: true }
}

export async function enqueueActivity(entry, persist = true) {
    items.push({ qid: newId(), kind: 'activity', table: 'activity_log', row: { ...entry, created_at: entry.created_at || new Date().toISOString() }, createdAt: Date.now(), attempts: 0, status: 'queued', lastError: null })
    if (persist) { emit(); await save(); schedule() }
}

export async function discardItem(qid) {
    const gone = items.find(i => i.qid === qid)
    items = items.filter(i => i.qid !== qid)
    if (gone?.kind === 'payment') patchTable('rent_payments', { remove: [gone.row.id] })
    emit(); await save(); schedule()
}

export async function retryFailed() {
    items = items.map(i => i.status === 'failed' ? { ...i, status: 'queued', lastError: null } : i)
    emit(); await save()
    return syncOutbox()
}

/** Sends the queue in order. Stops at the first connection problem; server rejections are kept as 'failed'. */
export async function syncOutbox() {
    if (running || items.length === 0 || !getNetworkState().online) return { sent: 0 }
    running = true
    setSyncing(true)
    let sent = 0
    try {
        for (const item of [...items]) {
            if (item.status === 'failed') continue
            const { data, error } = await supabase.from(item.table).insert([item.row]).select()
            if (error && !isDuplicate(error)) {
                if (isNetworkError(error)) { item.attempts += 1; break }
                item.status = 'failed'; item.lastError = error.message; item.attempts += 1
                continue
            }
            items = items.filter(i => i.qid !== item.qid)
            if (item.kind === 'payment') {
                sent += 1
                if (data?.length) patchTable('rent_payments', { upsert: data })
                else refreshTable('rent_payments')
            }
            await save()
        }
    } finally {
        running = false
        setSyncing(false)
        emit()
        await save()
        schedule()
    }
    if (sent > 0) window.dispatchEvent(new CustomEvent('outbox:synced', { detail: { sent } }))
    return { sent }
}

if (typeof window !== 'undefined') {
    window.addEventListener(NETWORK_RESTORED, () => { syncOutbox() })
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncOutbox() })
}

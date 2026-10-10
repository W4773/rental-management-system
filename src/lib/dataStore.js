import { useSyncExternalStore } from 'react'
import { supabase } from './supabase'
import { cacheGet, cacheSet, cacheDelete } from './localCache'
import { NETWORK_RESTORED } from './networkStatus'

/**
 * One shared, cached copy of every table, outside React.
 *  - Every hook that reads a table (however many components use it) shares the same state, the same
 *    request and the same realtime channel: opening the app costs one request per table.
 *  - The last data is kept in IndexedDB and painted at once on the next visit, then revalidated.
 *  - Realtime events and our own writes are applied to the local copy (no full re-download).
 *  - Rows created offline stay visible (`_pending`) until the outbox sends them.
 */
const byText = (key) => (a, b) => String(a[key] ?? '').localeCompare(String(b[key] ?? ''), 'es', { numeric: true })
const byTextDesc = (key) => (a, b) => String(b[key] ?? '').localeCompare(String(a[key] ?? ''))

const TABLES = {
    properties: { build: (q) => q.order('name'), sort: byText('name') },
    tenants: { build: (q) => q.order('created_at', { ascending: false }), sort: byTextDesc('created_at') },
    rent_payments: { build: (q) => q.order('payment_month', { ascending: false }), sort: byTextDesc('payment_month') },
    gas_consumption: { build: (q) => q.order('reading_date', { ascending: false }), sort: byTextDesc('reading_date') },
    // Optional: before migration 002 the table does not exist; the screen shows a hint instead
    buildings: { optional: true, build: (q) => q.order('name'), sort: byText('name') }
}

const initial = () => ({ data: [], loading: true, error: null, fromCache: false, fetchedAt: null, unavailable: false })

const states = {}
const listeners = {}
const inflight = {}
const dirty = {}
const channels = {}
const started = {}
const persistTimers = {}
let userKey = null

for (const name of Object.keys(TABLES)) { states[name] = initial(); listeners[name] = new Set() }

// Several tables usually change within a few milliseconds (cache + network answers): tell the screen once
const dirtyTables = new Set()
let emitTimer = null
const emit = (name) => {
    dirtyTables.add(name)
    if (emitTimer) return
    emitTimer = setTimeout(() => {
        emitTimer = null
        const names = [...dirtyTables]; dirtyTables.clear()
        for (const n of names) listeners[n].forEach(l => l()) // same tick: React folds them into one render
    }, 30)
}
const setState = (name, patch) => { states[name] = { ...states[name], ...patch }; emit(name) }

async function currentUserKey() {
    if (userKey) return userKey
    try {
        const { data } = await supabase.auth.getSession() // reads the stored session: no network needed
        userKey = data?.session?.user?.id || null
    } catch { userKey = null }
    return userKey
}

const cacheKey = (name) => `u:${userKey}:${name}`

function persist(name) {
    clearTimeout(persistTimers[name])
    persistTimers[name] = setTimeout(() => {
        if (!userKey) return
        const rows = states[name].data.filter(r => !r._pending)
        cacheSet(cacheKey(name), { rows, at: Date.now() })
    }, 300)
}

function mergeSorted(name, rows) {
    return [...rows].sort(TABLES[name].sort)
}

// The API answers at most 1000 rows per request: bigger tables must be read page by page,
// otherwise the oldest rows silently go missing (and vanish from the screen after any refresh).
const PAGE_SIZE = 1000

/** Reads the whole table in pages. `id` is the final sort key so pages never skip or repeat rows. */
async function fetchAllRows(name, cfg) {
    const page = (from) => cfg.build(supabase.from(name).select('*', { count: 'exact' })).order('id').range(from, from + PAGE_SIZE - 1)
    const first = await page(0)
    if (first.error) return first
    const rows = first.data || []
    const total = first.count ?? rows.length
    if (rows.length >= total || rows.length < PAGE_SIZE) return { data: rows, error: null }

    const starts = []
    for (let from = PAGE_SIZE; from < total; from += PAGE_SIZE) starts.push(from)
    const rest = await Promise.all(starts.map(page))
    const failed = rest.find(r => r.error)
    if (failed) return { data: null, error: failed.error }

    // A row written while paging could appear twice: keep one copy per id
    const byId = new Map()
    for (const r of [rows, ...rest.map(p => p.data || [])].flat()) byId.set(r.id, r)
    return { data: [...byId.values()], error: null }
}

/** Downloads the table (one request at a time per table; extra calls are folded into one re-run). */
export function refreshTable(name) {
    if (inflight[name]) { dirty[name] = true; return inflight[name] }
    inflight[name] = (async () => {
        try {
            do {
                dirty[name] = false
                const cfg = TABLES[name]
                const { data, error } = await fetchAllRows(name, cfg)
                if (error) {
                    if (cfg.optional) { setState(name, { data: [], unavailable: true, loading: false, error: null }); continue }
                    console.error(`Error fetching ${name}:`, error.message)
                    setState(name, { error: error.message, loading: false })
                    continue
                }
                // Keep rows that were created offline and not sent yet
                const serverIds = new Set((data || []).map(r => r.id))
                const pending = states[name].data.filter(r => r._pending && !serverIds.has(r.id))
                setState(name, {
                    data: pending.length ? mergeSorted(name, [...(data || []), ...pending]) : (data || []),
                    loading: false, error: null, unavailable: false, fromCache: false, fetchedAt: Date.now()
                })
                persist(name)
            }
            while (dirty[name])
        } catch (err) {
            // Network trouble: keep whatever we already show
            console.warn(`Could not refresh ${name}:`, err.message)
            setState(name, { loading: false, error: err.message })
        } finally {
            inflight[name] = null
        }
    })()
    return inflight[name]
}

/** Applies rows/removals to the local copy (own writes, realtime events, offline pending rows). */
export function patchTable(name, { upsert = [], remove = [] } = {}) {
    if (!TABLES[name]) return
    const byId = new Map(states[name].data.map(r => [r.id, r]))
    for (const id of remove) byId.delete(id)
    for (const row of upsert) {
        if (!row || row.id === undefined) continue
        const prev = byId.get(row.id)
        if (row._pending) {
            byId.set(row.id, { ...prev, ...row })
        } else {
            // A row confirmed by the server replaces its pending twin
            const { _pending: _p1, ...before } = prev || {}
            const { _pending: _p2, ...clean } = row
            byId.set(row.id, { ...before, ...clean })
        }
    }
    setState(name, { data: mergeSorted(name, [...byId.values()]), loading: false })
    persist(name)
}

export const getTableRows = (name) => states[name]?.data || []

function startRealtime(name) {
    if (channels[name]) return
    let everSubscribed = false
    channels[name] = supabase
        .channel(`store-${name}`)
        .on('postgres_changes', { event: '*', schema: 'rental', table: name }, (payload) => {
            const type = payload.eventType
            if (type === 'DELETE' && payload.old?.id !== undefined) return patchTable(name, { remove: [payload.old.id] })
            if ((type === 'INSERT' || type === 'UPDATE') && payload.new?.id !== undefined) return patchTable(name, { upsert: [payload.new] })
            refreshTable(name)
        })
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                // After a reconnection we may have missed events
                if (everSubscribed) refreshTable(name)
                everSubscribed = true
            }
        })
}

async function start(name) {
    if (started[name]) return
    started[name] = true
    await currentUserKey()
    // 1) paint from the cache right away
    try {
        const cached = userKey ? await cacheGet(cacheKey(name)) : null
        if (cached?.rows && states[name].loading) {
            setState(name, { data: mergeSorted(name, cached.rows), loading: false, fromCache: true, fetchedAt: cached.at })
        }
    } catch { /* no cache */ }
    // 2) revalidate from the network + live updates
    refreshTable(name)
    startRealtime(name)
}

function subscribeTo(name, listener) {
    listeners[name].add(listener)
    start(name)
    return () => listeners[name].delete(listener)
}

/** Subscribes a component to a table. Returns { data, loading, error, fromCache, fetchedAt, unavailable }. */
export function useTable(name) {
    return useSyncExternalStore((l) => subscribeTo(name, l), () => states[name], () => states[name])
}

export const getTableState = (name) => states[name]

export function refreshAllTables(names = Object.keys(TABLES)) {
    return Promise.all(names.map(n => refreshTable(n)))
}

/** Logout: forget everything, on screen and on disk. */
export async function resetStore() {
    for (const name of Object.keys(TABLES)) {
        clearTimeout(persistTimers[name])
        try { channels[name]?.unsubscribe() } catch { /* ignore */ }
        channels[name] = null
        started[name] = false
        inflight[name] = null
        setState(name, initial())
    }
    const key = userKey
    userKey = null
    // The unsent-payments queue is not cache: it is kept (for this user only) until it reaches the server
    if (key) await Promise.all([...Object.keys(TABLES), 'settings'].map(n => cacheDelete(`u:${key}:${n}`)))
}

if (typeof window !== 'undefined') {
    // Back online, or back to the tab: revalidate (cheap: one request per table, folded together)
    const revalidate = () => { for (const name of Object.keys(TABLES)) if (started[name]) refreshTable(name) }
    window.addEventListener(NETWORK_RESTORED, revalidate)
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') revalidate() })
}

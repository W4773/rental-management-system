import { cacheGet, cacheSet } from './localCache'
import { NETWORK_RESTORED, getNetworkState } from './networkStatus'

/**
 * Temporary error log (rental.error_log, migration 012): every failure of the app is captured with
 * enough evidence (where, what was sent, what the database answered) to fix it precisely.
 *
 * - Never throws and never blocks the app: logging problems are swallowed.
 * - Entries wait in a local buffer (IndexedDB) and are sent when there is a connection.
 * - Secrets are redacted and personal numbers masked before anything is stored.
 * - Repeated errors are folded (same fingerprint within 60 s) and bursts are limited.
 */
const QUEUE_KEY = 'errlog:queue'
const MAX_QUEUE = 100
const DEDUPE_MS = 60000
const BURST_LIMIT = 20 // per minute
const FLUSH_DELAY_MS = 2000

export const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev'

const SECRET_KEY = /pass(word)?|token|secret|authorization|apikey|api_key|refresh|cookie|signature/i
const clip = (v, n = 300) => (typeof v === 'string' && v.length > n ? v.slice(0, n) + '…' : v)

/** Masks national ids and phones inside free text. */
export function maskText(text) {
    return String(text ?? '')
        .replace(/\b\d{3}-?\d{7}-?\d\b/g, '***-*******-*')
        .replace(/\(?\b\d{3}\)?[\s-]?\d{3}-?\d{4}\b/g, '(***) ***-****')
        .replace(/(eyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]{5,})/g, '[jwt]')
}

/** Deep copy without secrets, with short strings, limited depth/size. */
export function redact(value, depth = 0) {
    if (value == null) return value
    if (typeof value === 'string') return maskText(clip(value))
    if (typeof value !== 'object') return value
    if (depth >= 4) return '[…]'
    if (Array.isArray(value)) return value.slice(0, 20).map(v => redact(v, depth + 1))
    const out = {}
    for (const [k, v] of Object.entries(value).slice(0, 40)) {
        if (SECRET_KEY.test(k)) out[k] = '[oculto]'
        else if (/identity_number|cedula|phone|email/i.test(k) && typeof v === 'string') out[k] = '[oculto]'
        else out[k] = redact(v, depth + 1)
    }
    return out
}

let queue = null
let loading = null
let flushTimer = null
let flushing = false
let remoteDisabled = false // table missing (migration 012 not applied yet)
const recent = new Map() // fingerprint -> last time
let windowStart = 0
let windowCount = 0
const listeners = new Set()
export const subscribeErrorLog = (l) => { listeners.add(l); return () => listeners.delete(l) }

async function load() {
    if (queue) return queue
    if (!loading) loading = cacheGet(QUEUE_KEY).then(q => { queue = Array.isArray(q) ? q : []; return queue }).catch(() => { queue = []; return queue })
    return loading
}
const save = () => cacheSet(QUEUE_KEY, queue).catch(() => {})

export const pendingErrorCount = () => (queue ? queue.length : 0)

async function currentActor() {
    try {
        const { supabase } = await import('./supabase')
        const { data } = await supabase.auth.getSession() // local, no network
        const user = data?.session?.user
        return user ? { id: user.id, email: user.email } : null
    } catch { return null }
}

/**
 * Records an error. `error` may be an Error, a Supabase error object or a string.
 * `context` is free evidence (table, operation, payload…): it is redacted automatically.
 */
export async function logError({ source = 'app', error, message, level = 'error', context = {} } = {}) {
    try {
        const msg = maskText(message || error?.message || (typeof error === 'string' ? error : '') || 'Error desconocido')
        const route = typeof location !== 'undefined' ? location.pathname : ''
        const fingerprint = `${source}|${msg}|${route}`
        const now = Date.now()
        if (now - (recent.get(fingerprint) || 0) < DEDUPE_MS) return
        recent.set(fingerprint, now)
        if (recent.size > 200) recent.delete(recent.keys().next().value)
        if (now - windowStart > 60000) { windowStart = now; windowCount = 0 }
        if (++windowCount > BURST_LIMIT) return

        const actor = await currentActor()
        if (!actor) return // signed out: nobody to attribute it to (and RLS would reject it)

        const ctx = redact({
            ...context,
            code: context.code ?? error?.code,
            details: context.details ?? error?.details,
            hint: context.hint ?? error?.hint,
            online: getNetworkState().online
        })
        const entry = {
            id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : String(now) + Math.random(),
            actor_id: actor.id,
            actor_email: actor.email,
            level,
            source,
            message: clip(msg, 1000),
            stack: error?.stack ? maskText(clip(String(error.stack), 3000)) : null,
            context: ctx,
            route,
            app_version: APP_VERSION,
            user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
            created_at: new Date().toISOString()
        }
        const q = await load()
        q.push(entry)
        if (q.length > MAX_QUEUE) q.splice(0, q.length - MAX_QUEUE)
        save()
        listeners.forEach(l => l())
        if (typeof console !== 'undefined') console.warn('[errorLog]', source, msg)
        scheduleFlush()
    } catch { /* the log must never break the app */ }
}

function scheduleFlush(delay = FLUSH_DELAY_MS) {
    clearTimeout(flushTimer)
    flushTimer = setTimeout(flushErrorLog, delay)
}

/** Sends the buffered entries; keeps them if there is no connection. */
export async function flushErrorLog() {
    if (flushing || remoteDisabled || !getNetworkState().online) return
    flushing = true
    try {
        const q = await load()
        if (q.length === 0) return
        const [{ supabase }, { getEffectiveOwnerId }] = await Promise.all([import('./supabase'), import('./effectiveOwner')])
        const actor = await currentActor()
        const owner = await getEffectiveOwnerId()
        if (!actor || !owner) return
        const mine = q.filter(e => e.actor_id === actor.id)
        if (mine.length === 0) { queue = []; await save(); return }
        const batch = mine.slice(0, 50).map(({ id, created_at, ...e }) => ({ ...e, id, created_at, user_id: owner }))
        const { error } = await supabase.from('error_log').insert(batch)
        if (error) {
            if (/relation|schema cache|does not exist|Could not find|42P01|PGRST205/i.test(`${error.code} ${error.message}`)) {
                remoteDisabled = true // migration 012 not applied: stop trying this session, keep the local copy only
                console.warn('error_log table not found: run supabase/migrations/012_error_log.sql')
            }
            return // network or server problem: try again later
        }
        const sent = new Set(batch.map(b => b.id))
        queue = q.filter(e => !sent.has(e.id))
        await save()
        listeners.forEach(l => l())
        if (queue.length > 0) scheduleFlush(500)
    } catch { /* try again later */ } finally { flushing = false }
}

/** Evidence for a failed Supabase/PostgREST request (called by resilientFetch). */
export async function logHttpFailure({ method, url, status, requestBody, responseText }) {
    try {
        const u = new URL(url)
        const parts = u.pathname.split('/')
        const rest = parts.indexOf('rest')
        const isRpc = parts.includes('rpc')
        const target = parts[parts.length - 1]
        let body = null
        try { body = JSON.parse(responseText) } catch { /* not JSON */ }
        let payload = null
        if (typeof requestBody === 'string') { try { payload = JSON.parse(requestBody) } catch { payload = clip(requestBody, 500) } }
        const missingTable = /PGRST205|42P01|relation .* does not exist|schema cache/i.test(`${body?.code} ${body?.message}`)
        await logError({
            source: 'supabase',
            level: status >= 500 || (status >= 400 && !missingTable) ? 'error' : 'warning',
            message: `${method} ${isRpc ? 'rpc/' : ''}${target} → ${status}: ${body?.message || clip(responseText, 200) || 'sin detalle'}`,
            context: {
                table: rest >= 0 ? target : undefined, operation: method, status,
                code: body?.code, details: body?.details, hint: body?.hint,
                query: u.search ? clip(decodeURIComponent(u.search), 300) : undefined,
                payload
            }
        })
    } catch { /* ignore */ }
}

export async function getLocalErrors() { return [...(await load())] }

if (typeof window !== 'undefined') {
    window.addEventListener(NETWORK_RESTORED, () => scheduleFlush(500))
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') scheduleFlush(1500) })
    // Uncaught errors and rejected promises anywhere in the app
    window.addEventListener('error', (e) => {
        if (e.target && e.target !== window) return // resource load errors (fonts…) are noise
        logError({ source: 'window.onerror', error: e.error, message: e.message, context: { file: e.filename, line: e.lineno, col: e.colno } })
    })
    window.addEventListener('unhandledrejection', (e) => {
        logError({ source: 'unhandledrejection', error: e.reason instanceof Error ? e.reason : null, message: e.reason?.message || String(e.reason) })
    })
    setTimeout(() => scheduleFlush(500), 3000)
}

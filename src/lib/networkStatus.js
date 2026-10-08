import { useSyncExternalStore } from 'react'

// Connection state shared by the whole app: browser online/offline, recent request failures and
// "slow" detection. The data store, the outbox and the banner all read it from here.
const SLOW_MS = 6000
const SLOW_HOLD_MS = 60000
const FAILS_TO_OFFLINE = 2

let state = {
    online: typeof navigator === 'undefined' ? true : navigator.onLine,
    slow: false,
    lastOkAt: null,
    pendingChanges: 0,
    syncing: false
}
let consecutiveFailures = 0
let slowUntil = 0
const listeners = new Set()

const emit = () => listeners.forEach(l => l())
const set = (patch) => {
    const next = { ...state, ...patch }
    if (Object.keys(patch).every(k => next[k] === state[k])) return
    state = next
    emit()
}

export const OFFLINE_MESSAGE = 'Sin conexión: esta acción necesita internet'
export const NETWORK_RESTORED = 'network:restored'

export const getNetworkState = () => state
export const isOnline = () => state.online

export function subscribeNetwork(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
}

export function useNetworkStatus() {
    return useSyncExternalStore(subscribeNetwork, getNetworkState, getNetworkState)
}

/** Called by the resilient fetch after every request. */
export function reportRequest(ok, durationMs = 0) {
    const now = Date.now()
    if (ok) {
        consecutiveFailures = 0
        if (durationMs > SLOW_MS) slowUntil = now + SLOW_HOLD_MS
        const wasOffline = !state.online
        set({ online: true, lastOkAt: now, slow: now < slowUntil })
        if (wasOffline) window.dispatchEvent(new Event(NETWORK_RESTORED))
    } else {
        consecutiveFailures += 1
        if (consecutiveFailures >= FAILS_TO_OFFLINE) set({ online: false })
    }
}

export const setPendingChanges = (n) => set({ pendingChanges: n })
export const setSyncing = (syncing) => set({ syncing })

if (typeof window !== 'undefined') {
    window.addEventListener('offline', () => set({ online: false }))
    window.addEventListener('online', () => {
        consecutiveFailures = 0
        set({ online: true })
        window.dispatchEvent(new Event(NETWORK_RESTORED))
    })
    // Slow flag expires by itself
    setInterval(() => { if (state.slow && Date.now() >= slowUntil) set({ slow: false }) }, 5000)
}

/**
 * Light probe used while we think we're offline: a real request tells us when the connection is
 * back even if the browser never fires the `online` event (flaky Wi-Fi).
 */
export function startReachabilityProbe(probe, intervalMs = 8000) {
    const id = setInterval(async () => {
        if (state.online) return
        try {
            if (await probe()) {
                consecutiveFailures = 0
                set({ online: true, lastOkAt: Date.now() })
                window.dispatchEvent(new Event(NETWORK_RESTORED))
            }
        } catch { /* still offline */ }
    }, intervalMs)
    return () => clearInterval(id)
}

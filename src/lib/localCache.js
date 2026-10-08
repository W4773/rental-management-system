// Tiny key-value cache on IndexedDB (with an in-memory fallback), used to paint the app instantly
// with the last data while the network catches up, and to hold the offline outbox.
const DB_NAME = 'alquiler-pro'
const STORE = 'kv'

const memory = new Map()
let dbPromise = null

function openDb() {
    if (dbPromise) return dbPromise
    dbPromise = new Promise((resolve) => {
        try {
            if (typeof indexedDB === 'undefined') return resolve(null)
            const req = indexedDB.open(DB_NAME, 1)
            req.onupgradeneeded = () => { req.result.createObjectStore(STORE) }
            req.onsuccess = () => resolve(req.result)
            req.onerror = () => resolve(null)
            req.onblocked = () => resolve(null)
        } catch {
            resolve(null)
        }
    })
    return dbPromise
}

const run = async (mode, fn) => {
    const db = await openDb()
    if (!db) return undefined
    return new Promise((resolve) => {
        try {
            const tx = db.transaction(STORE, mode)
            const result = fn(tx.objectStore(STORE))
            tx.oncomplete = () => resolve(result && 'result' in result ? result.result : undefined)
            tx.onerror = () => resolve(undefined)
            tx.onabort = () => resolve(undefined)
        } catch {
            resolve(undefined)
        }
    })
}

export async function cacheGet(key) {
    const viaDb = await run('readonly', (store) => store.get(key))
    return viaDb !== undefined ? viaDb : memory.get(key)
}

export async function cacheSet(key, value) {
    memory.set(key, value)
    await run('readwrite', (store) => store.put(value, key))
}

export async function cacheDelete(key) {
    memory.delete(key)
    await run('readwrite', (store) => store.delete(key))
}

/** Removes every key that starts with `prefix` (used on logout). */
export async function cacheClearPrefix(prefix) {
    for (const k of [...memory.keys()]) if (k.startsWith(prefix)) memory.delete(k)
    const db = await openDb()
    if (!db) return
    await new Promise((resolve) => {
        try {
            const tx = db.transaction(STORE, 'readwrite')
            const store = tx.objectStore(STORE)
            const req = store.openCursor()
            req.onsuccess = () => {
                const cursor = req.result
                if (!cursor) return
                if (String(cursor.key).startsWith(prefix)) cursor.delete()
                cursor.continue()
            }
            tx.oncomplete = () => resolve()
            tx.onerror = () => resolve()
            tx.onabort = () => resolve()
        } catch {
            resolve()
        }
    })
}

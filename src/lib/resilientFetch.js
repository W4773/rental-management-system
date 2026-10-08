import { reportRequest, getNetworkState, OFFLINE_MESSAGE } from './networkStatus'

const READ_TIMEOUT_MS = 20000
const WRITE_TIMEOUT_MS = 30000
const RETRIES = 2
const RETRY_STATUS = new Set([502, 503, 504])

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

/**
 * fetch with a time limit and, for READS ONLY, retries with growing waits on network errors
 * and gateway errors. Writes are never retried here (the outbox does that safely, with ids that
 * make a repeat harmless). Every outcome is reported to the network status.
 */
export function resilientFetch(input, init = {}) {
    const url = typeof input === 'string' ? input : input?.url || ''
    // Uploads / downloads of files and websockets keep the native behaviour
    if (url.includes('/storage/v1/')) return fetch(input, init)

    const method = String(init.method || (typeof input !== 'string' && input?.method) || 'GET').toUpperCase()
    const idempotent = method === 'GET' || method === 'HEAD'
    // Known to be offline: changes that cannot wait fail at once with a clear message instead of hanging
    // (payments never get here: they go to the outbox first). Login/token calls keep the native behaviour.
    if (!idempotent && !getNetworkState().online && !url.includes('/auth/v1/')) {
        return Promise.reject(new TypeError(OFFLINE_MESSAGE))
    }
    const attempts = idempotent ? RETRIES + 1 : 1
    const timeoutMs = idempotent ? READ_TIMEOUT_MS : WRITE_TIMEOUT_MS

    return (async () => {
        let lastError
        for (let i = 0; i < attempts; i++) {
            const controller = new AbortController()
            const outer = init.signal
            const onOuterAbort = () => controller.abort(outer.reason)
            if (outer) {
                if (outer.aborted) throw outer.reason || new DOMException('Aborted', 'AbortError')
                outer.addEventListener('abort', onOuterAbort, { once: true })
            }
            const timer = setTimeout(() => controller.abort(new DOMException('La conexión tardó demasiado', 'TimeoutError')), timeoutMs)
            const started = Date.now()
            try {
                const response = await fetch(input, { ...init, signal: controller.signal })
                clearTimeout(timer)
                if (RETRY_STATUS.has(response.status) && i < attempts - 1) {
                    reportRequest(false)
                    await sleep(400 * 2 ** i + Math.random() * 200)
                    continue
                }
                reportRequest(true, Date.now() - started)
                return response
            } catch (err) {
                clearTimeout(timer)
                if (outer?.aborted) throw err // the caller cancelled: not a network problem
                lastError = err
                reportRequest(false)
                if (i < attempts - 1) await sleep(400 * 2 ** i + Math.random() * 200)
            } finally {
                outer?.removeEventListener('abort', onOuterAbort)
            }
        }
        throw lastError
    })()
}

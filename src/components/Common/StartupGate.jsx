import { useEffect, useState } from 'react'
import { useApp } from '../../contexts/AppContext'
import { useNetworkStatus } from '../../lib/networkStatus'

const SETTLE_CHECK_MS = 100
const QUIET_CHECKS = 3      // consecutive checks without the screen being busy
const MAX_SETTLE_MS = 5000  // never hold the user longer than this once the data is in
const SLOW_HINT_MS = 12000

/**
 * Full-screen loading screen shown when the app opens. It stays until the data is in AND the screen
 * has finished drawing (the main thread is quiet), so what you see is already ready to click
 * instead of a page that looks ready but ignores taps for a few seconds.
 */
export default function StartupGate() {
    const { loading } = useApp()
    const net = useNetworkStatus()
    const [ready, setReady] = useState(false)
    const [gone, setGone] = useState(false)
    const [slow, setSlow] = useState(false)

    // Data loaded: wait until the main thread is quiet (timers fire on time several times in a row)
    useEffect(() => {
        if (loading || ready) return
        let cancelled = false
        let quiet = 0
        let last = performance.now()
        const deadline = last + MAX_SETTLE_MS
        let timer
        const tick = () => {
            if (cancelled) return
            const now = performance.now()
            const lateBy = now - last - SETTLE_CHECK_MS
            last = now
            quiet = lateBy < 40 ? quiet + 1 : 0
            if (quiet >= QUIET_CHECKS || now >= deadline) setReady(true)
            else timer = setTimeout(tick, SETTLE_CHECK_MS)
        }
        timer = setTimeout(tick, SETTLE_CHECK_MS)
        return () => { cancelled = true; clearTimeout(timer) }
    }, [loading, ready])

    // Waiting for the network with nothing saved yet: say so after a while and offer a way in
    useEffect(() => {
        if (ready) return
        const t = setTimeout(() => setSlow(true), SLOW_HINT_MS)
        return () => clearTimeout(t)
    }, [ready])

    useEffect(() => {
        if (!ready) return
        const t = setTimeout(() => setGone(true), 250) // after the fade-out
        return () => clearTimeout(t)
    }, [ready])

    if (gone) return null
    return (
        <div role="status" aria-live="polite" aria-busy={!ready}
            className={`no-print fixed inset-0 z-[100] bg-[#faf7f2] flex flex-col items-center justify-center gap-5 transition-opacity duration-200 ${ready ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <img src="/logo-stacked.svg" alt="Alquiler Pro" className="h-24 w-auto" />
            <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-brand-600" />
            <p className="text-sm text-gray-500">Cargando tu información…</p>
            {slow && !ready && (
                <div className="max-w-xs text-center space-y-2">
                    <p className="text-xs text-amber-700">
                        {net.online ? 'Está tardando más de lo normal: la conexión parece lenta.' : 'Sin conexión: no hay datos guardados en este equipo todavía.'}
                    </p>
                    <button type="button" onClick={() => setReady(true)}
                        className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50">
                        Entrar de todos modos
                    </button>
                </div>
            )}
        </div>
    )
}

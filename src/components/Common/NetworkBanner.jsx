import { useEffect, useState, useSyncExternalStore } from 'react'
import { WifiOff, Wifi, RefreshCw, CloudUpload, Trash2, AlertTriangle } from 'lucide-react'
import { useNetworkStatus, startReachabilityProbe } from '../../lib/networkStatus'
import { subscribeOutbox, getOutbox, retryFailed, discardItem, syncOutbox } from '../../lib/outbox'
import { refreshAllTables } from '../../lib/dataStore'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

// A tiny request that answers even without a session: any HTTP answer means the connection is back
async function probe() {
    if (!SUPABASE_URL) return navigator.onLine
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 6000)
    try {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/health`, { signal: ctrl.signal, cache: 'no-store' })
        return res.status < 500
    } finally { clearTimeout(t) }
}

function ago(ts, now) {
    if (!ts) return null
    const m = Math.floor((now - ts) / 60000)
    if (m < 1) return 'hace un momento'
    if (m < 60) return `hace ${m} min`
    const h = Math.floor(m / 60)
    return h < 24 ? `hace ${h} h` : `hace ${Math.floor(h / 24)} d`
}

/** Thin bar under the header: offline / slow connection, unsent payments and rejected ones. */
export default function NetworkBanner() {
    const net = useNetworkStatus()
    const queue = useSyncExternalStore(subscribeOutbox, getOutbox, getOutbox)
    const [now, setNow] = useState(Date.now())
    const [retrying, setRetrying] = useState(false)

    useEffect(() => startReachabilityProbe(probe), [])
    useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(id) }, [])

    const pending = queue.filter(i => i.kind === 'payment' && i.status !== 'failed')
    const failed = queue.filter(i => i.status === 'failed')

    const retry = async () => {
        setRetrying(true)
        try {
            if (await probe().catch(() => false)) {
                window.dispatchEvent(new Event('network:restored'))
                await Promise.all([retryFailed(), refreshAllTables()])
            }
        } finally { setRetrying(false) }
    }

    if (net.online && !net.slow && pending.length === 0 && failed.length === 0) return null

    const saved = ago(net.lastOkAt, now)
    return (
        <div role="status" aria-live="polite" className="no-print">
            {!net.online && (
                <div className="bg-amber-50 border-b border-amber-200 text-amber-900 text-[12.5px]">
                    <div className="max-w-[1500px] mx-auto px-3 sm:px-5 py-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <WifiOff className="w-4 h-4 shrink-0" />
                        <span className="font-semibold">Sin conexión</span>
                        <span>· Estás viendo los datos guardados{saved ? ` (${saved})` : ''}. Puedes registrar pagos; lo demás necesita internet.</span>
                        {pending.length > 0 && <span className="font-semibold">· {pending.length} pago{pending.length === 1 ? '' : 's'} por enviar</span>}
                        <button type="button" onClick={retry} disabled={retrying} className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-amber-300 font-semibold hover:bg-amber-100 disabled:opacity-60">
                            <RefreshCw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />Reintentar
                        </button>
                    </div>
                </div>
            )}
            {net.online && net.slow && (
                <div className="bg-sky-50 border-b border-sky-200 text-sky-900 text-[12.5px]">
                    <div className="max-w-[1500px] mx-auto px-3 sm:px-5 py-1.5 flex items-center gap-2">
                        <Wifi className="w-4 h-4 shrink-0" /><span className="font-semibold">Conexión lenta</span>
                        <span>· Seguimos mostrando los datos guardados mientras se actualizan.</span>
                    </div>
                </div>
            )}
            {net.online && pending.length > 0 && (
                <div className="bg-brand-50 border-b border-brand-200 text-brand-800 text-[12.5px]">
                    <div className="max-w-[1500px] mx-auto px-3 sm:px-5 py-1.5 flex items-center gap-2">
                        <CloudUpload className={`w-4 h-4 shrink-0 ${net.syncing ? 'animate-pulse' : ''}`} />
                        <span>{net.syncing ? 'Enviando' : 'Por enviar:'} {pending.length} pago{pending.length === 1 ? '' : 's'}…</span>
                        {!net.syncing && <button type="button" onClick={() => syncOutbox()} className="ml-auto px-2 py-0.5 rounded-md bg-white border border-brand-200 font-semibold hover:bg-brand-100">Enviar ahora</button>}
                    </div>
                </div>
            )}
            {failed.length > 0 && (
                <div className="bg-red-50 border-b border-red-200 text-red-800 text-[12.5px]">
                    <div className="max-w-[1500px] mx-auto px-3 sm:px-5 py-1.5 space-y-1">
                        <div className="flex items-center gap-2 font-semibold"><AlertTriangle className="w-4 h-4" />{failed.length} cambio{failed.length === 1 ? '' : 's'} no se pudo guardar en el servidor</div>
                        {failed.map(i => (
                            <div key={i.qid} className="flex flex-wrap items-center gap-2 pl-6">
                                <span>{i.kind === 'payment' ? `Pago de ${i.row?.amount_paid ?? ''} (${(i.row?.payment_month || '').slice(0, 7)})` : 'Registro'}: {i.lastError}</span>
                                <button type="button" onClick={() => discardItem(i.qid)} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-red-300 font-semibold hover:bg-red-100"><Trash2 className="w-3 h-3" />Descartar</button>
                            </div>
                        ))}
                        <button type="button" onClick={() => retryFailed()} className="ml-6 px-2 py-0.5 rounded-md bg-white border border-red-300 font-semibold hover:bg-red-100">Reintentar</button>
                    </div>
                </div>
            )}
        </div>
    )
}

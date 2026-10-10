import { useCallback, useEffect, useState } from 'react'
import { Copy, Download, RefreshCw, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { flushErrorLog, getLocalErrors, subscribeErrorLog, APP_VERSION } from '../../lib/errorLog'
import { useApp } from '../../contexts/AppContext'
import { useTeam } from '../../hooks/useTeam'

const LEVEL_STYLE = { error: 'bg-red-100 text-red-700', warning: 'bg-amber-100 text-amber-800' }
const fmt = (iso) => new Date(iso).toLocaleString('es-DO', { dateStyle: 'short', timeStyle: 'medium' })

/** Temporary error log (kept 7 days): evidence to share when something fails. */
export default function ErrorLogSettings() {
    const { toast } = useApp()
    const { isOwner } = useTeam()
    const [rows, setRows] = useState([])
    const [local, setLocal] = useState([])
    const [loading, setLoading] = useState(true)
    const [missing, setMissing] = useState(false)
    const [open, setOpen] = useState(null)
    const [level, setLevel] = useState('all')

    const load = useCallback(async () => {
        setLoading(true)
        await flushErrorLog()
        setLocal(await getLocalErrors())
        const { data, error } = await supabase.from('error_log').select('*').order('created_at', { ascending: false }).limit(200)
        if (error) setMissing(/relation|schema cache|does not exist|Could not find|PGRST205|42P01/i.test(`${error.code} ${error.message}`))
        else { setMissing(false); setRows(data || []) }
        setLoading(false)
    }, [])

    useEffect(() => { load(); return subscribeErrorLog(() => getLocalErrors().then(setLocal)) }, [load])

    // Entries still waiting to be sent are shown too (marked), so nothing seems to be missing
    const all = [...local.map(e => ({ ...e, _local: true })), ...rows.filter(r => !local.some(l => l.id === r.id))]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
    const shown = level === 'all' ? all : all.filter(r => r.level === level)

    const report = () => JSON.stringify({ app_version: APP_VERSION, generated_at: new Date().toISOString(), entries: shown.map(({ _local, ...e }) => e) }, null, 2)
    const copy = async () => {
        try { await navigator.clipboard.writeText(report()); toast.success('Registro copiado: pégalo en el chat de soporte') }
        catch { toast.error('No se pudo copiar; usa Descargar') }
    }
    const download = () => {
        const url = URL.createObjectURL(new Blob([report()], { type: 'application/json' }))
        const a = Object.assign(document.createElement('a'), { href: url, download: `registro-errores-${new Date().toISOString().slice(0, 10)}.json` })
        a.click(); URL.revokeObjectURL(url)
    }
    const clear = async () => {
        if (!window.confirm('¿Vaciar el registro de errores? Se borra para todo el equipo.')) return
        const { error } = await supabase.from('error_log').delete().eq('user_id', rows[0]?.user_id || '00000000-0000-0000-0000-000000000000')
        if (error) return toast.error('No se pudo vaciar: ' + error.message)
        setRows([]); toast.success('Registro vaciado')
    }

    if (missing) {
        return (
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
                Falta ejecutar <code>supabase/migrations/012_error_log.sql</code> en Supabase para guardar el registro de errores.
                Mientras tanto, los errores se guardan solo en este equipo y se enviarán cuando exista la tabla.
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-[18px] font-bold text-gray-900">Registro de errores</h3>
                <p className="text-sm text-gray-500">Cada fallo de la app se guarda aquí con su evidencia durante 7 días. Si algo falla, copia o descarga el registro y compártelo para corregirlo con precisión. Las contraseñas, tokens, cédulas y teléfonos se ocultan.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <select value={level} onChange={(e) => setLevel(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-2 py-1.5">
                    <option value="all">Todos</option><option value="error">Errores</option><option value="warning">Avisos</option>
                </select>
                <button type="button" onClick={load} className="inline-flex items-center gap-1 text-sm px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"><RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />Actualizar</button>
                <button type="button" onClick={copy} disabled={shown.length === 0} className="inline-flex items-center gap-1 text-sm px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"><Copy className="w-3.5 h-3.5" />Copiar</button>
                <button type="button" onClick={download} disabled={shown.length === 0} className="inline-flex items-center gap-1 text-sm px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"><Download className="w-3.5 h-3.5" />Descargar JSON</button>
                {isOwner && <button type="button" onClick={clear} disabled={rows.length === 0} className="ml-auto inline-flex items-center gap-1 text-sm px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"><Trash2 className="w-3.5 h-3.5" />Vaciar</button>}
            </div>

            {shown.length === 0 ? (
                <p className="text-sm italic text-gray-500 py-6 text-center">{loading ? 'Cargando…' : 'No hay errores registrados. 🎉'}</p>
            ) : (
                <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl bg-white">
                    {shown.map(e => (
                        <li key={e.id} className="px-3 py-2">
                            <button type="button" onClick={() => setOpen(open === e.id ? null : e.id)} className="w-full flex items-start gap-2 text-left">
                                {open === e.id ? <ChevronDown className="w-4 h-4 mt-0.5 shrink-0" /> : <ChevronRight className="w-4 h-4 mt-0.5 shrink-0" />}
                                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${LEVEL_STYLE[e.level] || LEVEL_STYLE.error}`}>{e.level}</span>
                                <span className="flex-1 min-w-0">
                                    <span className="block text-[13px] font-medium text-gray-800 break-words">{e.message}</span>
                                    <span className="block text-[11px] text-gray-500">{fmt(e.created_at)} · {e.source} · {e.route || '/'}{e.actor_email ? ` · ${e.actor_email}` : ''}{e._local ? ' · por enviar' : ''}</span>
                                </span>
                            </button>
                            {open === e.id && (
                                <pre className="mt-2 ml-6 text-[11px] bg-gray-50 border border-gray-200 rounded-lg p-2 overflow-auto max-h-64 whitespace-pre-wrap">{JSON.stringify({ context: e.context, stack: e.stack, app_version: e.app_version, user_agent: e.user_agent }, null, 2)}</pre>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

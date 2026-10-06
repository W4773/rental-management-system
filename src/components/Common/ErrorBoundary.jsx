import { Component } from 'react'
import { AlertTriangle } from 'lucide-react'

/** Keeps a render error in one screen from blanking the whole app; shows the cause so it can be reported. */
export default class ErrorBoundary extends Component {
    state = { error: null }

    static getDerivedStateFromError(error) {
        return { error }
    }

    componentDidCatch(error, info) {
        console.error('Error de interfaz:', error, info?.componentStack)
    }

    render() {
        const { error } = this.state
        if (!error) return this.props.children
        return (
            <div role="alert" className="max-w-xl mx-auto mt-10 bg-white rounded-xl border border-red-200 shadow-sm p-6 text-center space-y-3">
                <AlertTriangle className="w-8 h-8 mx-auto text-red-500" />
                <h2 className="text-lg font-bold text-ink">Algo salió mal en esta pantalla</h2>
                <p className="text-sm text-gray-600">Tus datos están a salvo. Recarga la página o vuelve al inicio; si se repite, envía este detalle a soporte:</p>
                <pre className="text-left text-xs bg-gray-50 border border-gray-200 rounded-lg p-2 overflow-auto max-h-32 whitespace-pre-wrap">{String(error?.message || error)}</pre>
                <div className="flex justify-center gap-2">
                    <button onClick={() => window.location.reload()} className="px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-semibold">Recargar</button>
                    <a href="/" className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700">Ir al inicio</a>
                </div>
            </div>
        )
    }
}

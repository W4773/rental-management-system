import { AlertTriangle } from 'lucide-react'
import Modal from '../Common/Modal'
import Button from '../Common/Button'
import { formatCurrency } from '../../lib/calculations'
import { formatMonthKey } from '../../lib/paymentStatus'

/** Shown before a collection letter when the tenant has late months: apply the late fee or leave it out. */
export default function LateFeePrompt({ data, onChoose, onClose }) {
    if (!data) return null
    const { tenant, status, fee } = data
    if (fee.total <= 0) {
        // No late fee by the rule (or the rule is off): offer to add one by hand
        return (
            <Modal isOpen onClose={onClose} title="Esta carta no tiene mora" size="sm">
                <div className="space-y-3 py-1">
                    <p className="text-sm text-gray-700">
                        {tenant?.name} no tiene mora calculada. ¿Quieres agregar una mora manualmente (por porcentaje o monto, mes por mes)?
                    </p>
                    <p className="text-xs text-gray-500">Útil, por ejemplo, para un inquilino nuevo que ya traía atrasos antes de entrar a la app.</p>
                </div>
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-3">
                    <Button variant="secondary" size="sm" onClick={() => onChoose('none')}>No, generar sin mora</Button>
                    <Button size="sm" onClick={() => onChoose('manual')} autoFocus>Sí, agregar mora</Button>
                </div>
            </Modal>
        )
    }
    return (
        <Modal isOpen onClose={onClose} title="Este pago presenta mora" size="sm">
            <div className="space-y-3 py-1">
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{tenant?.name} tiene {fee.items.length} mes(es) con mora, por un total de <strong>{formatCurrency(fee.total)}</strong>.</span>
                </div>
                <ul className="text-sm text-gray-700 space-y-0.5">
                    {fee.items.map(i => (
                        <li key={i.key} className="flex justify-between"><span className="capitalize">{formatMonthKey(i.key)}{i.manual && <em className="not-italic text-[11px] text-gray-500"> · manual</em>}</span><span>{formatCurrency(i.amount)}</span></li>
                    ))}
                </ul>
                <div className="text-sm text-gray-600 border-t border-gray-200 pt-2 space-y-0.5">
                    <p className="flex justify-between"><span>Renta pendiente</span><span>{formatCurrency(status.owedAmount)}</span></p>
                    <p className="flex justify-between font-semibold text-ink"><span>Total con mora</span><span>{formatCurrency(status.owedAmount + fee.total)}</span></p>
                </div>
                <p className="text-xs text-gray-500">Si el pago ya se hizo y solo falta registrarlo, genera la carta sin mora.</p>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-3">
                <Button variant="secondary" size="sm" onClick={() => onChoose('none')}>Sin mora</Button>
                <Button variant="secondary" size="sm" onClick={() => onChoose('manual')}>Ajustar manualmente</Button>
                <Button size="sm" onClick={() => onChoose('apply')} autoFocus>Aplicar mora</Button>
            </div>
        </Modal>
    )
}

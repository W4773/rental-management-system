import { Send } from 'lucide-react'
import Modal from '../Common/Modal'
import Button from '../Common/Button'
import { canShareFile, letterMessage, openWhatsAppChat, shareLetterFile, whatsappNumber } from '../../lib/shareLetter'

/** Shown after a collection letter is generated: offers to send it to the tenant through WhatsApp. */
export default function SendLetterPrompt({ data, toast, onClose }) {
    if (!data) return null
    const { file, tenant, property, status } = data
    const text = letterMessage({ tenant, property, status })
    const number = whatsappNumber(tenant?.phone)
    const viaShare = canShareFile(file)

    const handleSend = async () => {
        if (viaShare) {
            const result = await shareLetterFile(file, text)
            if (result === 'failed') toast.error('No se pudo abrir el menú de compartir. La carta quedó descargada.')
            if (result !== 'shared') return
        } else if (number) {
            openWhatsAppChat(number, text)
            toast.info('Se abrió el chat. Adjunta el PDF descargado (arrástralo al chat).')
        } else {
            toast.warning(`${tenant?.name || 'El inquilino'} no tiene un teléfono válido registrado. La carta quedó descargada.`)
        }
        onClose()
    }

    return (
        <Modal isOpen onClose={onClose} title="Carta generada" size="sm">
            <div className="py-2">
                <p className="font-medium text-ink">¿Desea enviársela al inquilino?</p>
                <p className="text-sm text-gray-600 mt-1">
                    {viaShare
                        ? 'Se abrirá el menú de compartir con el PDF adjunto: elige WhatsApp y el contacto.'
                        : number
                            ? `Se abrirá el chat de WhatsApp de ${tenant.name}. Adjunta el PDF descargado arrastrándolo al chat.`
                            : 'Este inquilino no tiene un teléfono válido registrado.'}
                </p>
            </div>
            <div className="flex justify-end gap-2 mt-4">
                <Button variant="secondary" size="sm" onClick={onClose}>Ahora no</Button>
                <Button size="sm" onClick={handleSend} className="inline-flex items-center gap-1.5" autoFocus>
                    <Send className="w-4 h-4" /> Sí, enviar
                </Button>
            </div>
        </Modal>
    )
}

import { useState } from 'react'
import Modal from './Modal'
import Button from './Button'

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirmar", cancelText = "Cancelar", isDanger = false }) {
    const [isLoading, setIsLoading] = useState(false)

    const handleConfirm = async () => {
        setIsLoading(true)
        try {
            await onConfirm()
            onClose()
        } catch (error) {
            console.error('Confirmation action failed:', error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
            <div className="py-4">
                <p className="text-gray-700">{message}</p>
            </div>

            <div className="flex justify-end gap-3 mt-6">
                <Button
                    variant="secondary"
                    onClick={onClose}
                    disabled={isLoading}
                >
                    {cancelText}
                </Button>
                <Button
                    variant={isDanger ? "danger" : "primary"}
                    onClick={handleConfirm}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <span className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Procesando...
                        </span>
                    ) : confirmText}
                </Button>
            </div>
        </Modal>
    )
}

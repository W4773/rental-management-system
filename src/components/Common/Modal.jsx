import { useEffect } from 'react'

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }

        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [isOpen])

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose()
            }
        }

        document.addEventListener('keydown', handleEscape)
        return () => document.removeEventListener('keydown', handleEscape)
    }, [isOpen, onClose])

    if (!isOpen) return null

    const sizes = {
        sm: 'md:max-w-md',
        md: 'md:max-w-2xl',
        lg: 'md:max-w-4xl',
        xl: 'md:max-w-6xl'
    }

    return (
        <div className="fixed inset-0 z-50 md:overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                onClick={onClose}
            />

            {/* Phone: bottom sheet. md+: centered dialog, same as before. */}
            <div className="fixed inset-x-0 bottom-0 md:static md:flex md:min-h-screen md:items-center md:justify-center md:p-4">
                <div
                    className={`relative flex w-full ${sizes[size]} flex-col bg-white shadow-xl rounded-t-2xl md:rounded-xl max-h-[92dvh] ${
                        size === 'sm' ? '' : 'h-[92dvh]'} md:h-auto md:max-h-none animate-sheet-up`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
                        <h2 className="text-base font-semibold text-ink">{title}</h2>
                        <button
                            onClick={onClose}
                            aria-label="Cerrar"
                            className="flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:max-h-[calc(100vh-160px)] md:flex-none md:pb-3">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    )
}

// src/components/Modals/RegisterUtilityModal.jsx
// Placeholder — will be replaced in Task 8
export default function RegisterUtilityModal({ isOpen, utilityType, onClose, onSuccess }) {
    if (!isOpen) return null
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-8 max-w-sm w-full text-center shadow-xl">
                <p className="text-gray-500 text-[18px] mb-4">
                    Registrar {utilityType === 'gas' ? 'Gas' : utilityType === 'electricity' ? 'Luz' : 'Agua'} — en construcción
                </p>
                <button
                    onClick={onClose}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-5 py-2 rounded-lg transition"
                >
                    Cerrar
                </button>
            </div>
        </div>
    )
}

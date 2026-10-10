import { useState } from 'react'
import { Ellipsis } from 'lucide-react'
import Modal from './Modal'

/** "⋯" button that opens a bottom sheet with a list of actions (phone-friendly row menu). */
export default function RowMenu({ title, items, label = 'Más acciones' }) {
    const [open, setOpen] = useState(false)
    const list = items.filter(Boolean)
    if (list.length === 0) return null

    return (
        <>
            <button type="button" aria-label={label} aria-haspopup="dialog" onClick={() => setOpen(true)}
                className="flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 active:bg-gray-50">
                <Ellipsis className="w-5 h-5" />
            </button>
            {/* Mounted only while open: a closed Modal still resets body scroll-lock when it mounts */}
            {open && (
                <Modal isOpen onClose={() => setOpen(false)} title={title} size="sm">
                    <ul className="-mx-4 divide-y divide-gray-100 border-y border-gray-100">
                        {list.map(({ label: text, icon: Icon, onClick, danger }) => (
                            <li key={text}>
                                <button type="button" onClick={() => { setOpen(false); onClick() }}
                                    className={`w-full flex items-center gap-3 px-4 min-h-[48px] text-sm text-left ${
                                        danger ? 'text-red-600 active:bg-red-50' : 'text-gray-700 active:bg-gray-50'}`}>
                                    <Icon className="w-5 h-5" />{text}
                                </button>
                            </li>
                        ))}
                    </ul>
                </Modal>
            )}
        </>
    )
}

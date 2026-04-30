// src/components/Layout/Sidebar.jsx
import { useState } from 'react'

const SECTIONS = [
    { id: 'resumen',     icon: '📊', label: 'Resumen' },
    { id: 'propiedades', icon: '🏠', label: 'Propiedades' },
    { id: 'inquilinos',  icon: '👤', label: 'Inquilinos' },
    { id: 'gastos',      icon: '📝', label: 'Gastos' },
]

export default function Sidebar({ activeSection, onSectionChange }) {
    const [collapsed, setCollapsed] = useState(false)

    return (
        <aside
            className={`${collapsed ? 'w-16' : 'w-56'} bg-white border-r border-gray-200 flex flex-col transition-all duration-200 flex-shrink-0`}
            style={{ minHeight: 'calc(100vh - 65px)' }}
        >
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="self-end m-3 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
                style={{ minHeight: '40px', minWidth: '40px' }}
            >
                {collapsed ? '→' : '←'}
            </button>

            <nav className="flex flex-col gap-1 px-2">
                {SECTIONS.map(section => (
                    <button
                        key={section.id}
                        onClick={() => onSectionChange(section.id)}
                        className={`sidebar-nav-item ${activeSection === section.id ? 'active' : ''}`}
                        title={collapsed ? section.label : undefined}
                    >
                        <span className="text-2xl flex-shrink-0">{section.icon}</span>
                        {!collapsed && <span>{section.label}</span>}
                    </button>
                ))}
            </nav>
        </aside>
    )
}

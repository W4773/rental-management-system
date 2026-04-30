// src/components/Layout/AppLayout.jsx
import Header from '../Common/Header'
import Sidebar from './Sidebar'
import Footer from '../Common/Footer'

export default function AppLayout({ activeSection, onSectionChange, children }) {
    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col">
            <Header />
            <div className="flex flex-1">
                <Sidebar activeSection={activeSection} onSectionChange={onSectionChange} />
                <main className="flex-1 overflow-auto p-6">
                    {children}
                </main>
            </div>
            <Footer />
        </div>
    )
}

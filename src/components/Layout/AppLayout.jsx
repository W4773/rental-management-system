import { Outlet } from 'react-router-dom'
import { AppProvider } from '../../contexts/AppContext'
import Header from './Header'

export default function AppLayout() {
    return (
        <AppProvider>
            <div className="min-h-screen bg-[#faf7f2] flex flex-col">
                <Header />
                <main className="flex-1 w-full max-w-[1500px] mx-auto px-3 sm:px-5 py-4">
                    <Outlet />
                </main>
                <footer className="text-center text-[11px] text-gray-400 py-3">
                    &copy; {new Date().getFullYear()} Alquiler Pro · Desarrollado por Optimard · v1.4.0
                </footer>
            </div>
        </AppProvider>
    )
}

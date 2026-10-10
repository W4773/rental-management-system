import { Outlet, useLocation } from 'react-router-dom'
import ErrorBoundary from '../Common/ErrorBoundary'
import { AppProvider } from '../../contexts/AppContext'
import Header from './Header'
import NetworkBanner from '../Common/NetworkBanner'
import StartupGate from '../Common/StartupGate'
import BottomNav from './BottomNav'

export default function AppLayout() {
    const location = useLocation()
    return (
        <ErrorBoundary>
        <AppProvider>
            <StartupGate />
            <div className="min-h-screen bg-[#faf7f2] flex flex-col">
                <Header />
                <NetworkBanner />
                <main className="flex-1 w-full max-w-[1500px] mx-auto px-3 sm:px-5 py-4">
                    <ErrorBoundary key={location.pathname}><Outlet /></ErrorBoundary>
                </main>
                <footer className="text-center text-[11px] text-gray-400 pt-3 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:py-3">
                    &copy; {new Date().getFullYear()} Alquiler Pro · Desarrollado por Optimard · v1.13.0
                </footer>
                <BottomNav />
            </div>
        </AppProvider>
        </ErrorBoundary>
    )
}

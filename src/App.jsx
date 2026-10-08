import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/Layout/AppLayout'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import './index.css'

// Heavier pages load on demand, so the first screen downloads less
const Properties = lazy(() => import('./pages/Properties'))
const Buildings = lazy(() => import('./pages/Buildings'))
const BuildingDetail = lazy(() => import('./pages/BuildingDetail'))
const Finances = lazy(() => import('./pages/Finances'))
const Tenants = lazy(() => import('./pages/Tenants'))
const Expenses = lazy(() => import('./pages/Expenses'))
const Settings = lazy(() => import('./pages/Settings'))
const PageFallback = () => <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" /></div>

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Suspense fallback={<PageFallback />}>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                        <Route path="/" element={<Home />} />
                        <Route path="/propiedades" element={<Properties />} />
                        <Route path="/edificios" element={<Buildings />} />
                        <Route path="/edificios/:id" element={<BuildingDetail />} />
                        <Route path="/inquilinos" element={<Tenants />} />
                        <Route path="/finanzas" element={<Finances />} />
                        <Route path="/gastos" element={<Expenses />} />
                        <Route path="/settings" element={<Settings />} />
                    </Route>
                    <Route path="/dashboard" element={<Navigate to="/" replace />} />
                    <Route path="/reports" element={<Navigate to="/propiedades" replace />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                </Suspense>
            </BrowserRouter>
        </AuthProvider>
    )
}

export default App

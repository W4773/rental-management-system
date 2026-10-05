import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/Layout/AppLayout'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import Properties from './pages/Properties'
import Tenants from './pages/Tenants'
import Expenses from './pages/Expenses'
import Settings from './pages/Settings'
import './index.css'

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                        <Route path="/" element={<Home />} />
                        <Route path="/propiedades" element={<Properties />} />
                        <Route path="/inquilinos" element={<Tenants />} />
                        <Route path="/gastos" element={<Expenses />} />
                        <Route path="/settings" element={<Settings />} />
                    </Route>
                    <Route path="/dashboard" element={<Navigate to="/" replace />} />
                    <Route path="/reports" element={<Navigate to="/propiedades" replace />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    )
}

export default App

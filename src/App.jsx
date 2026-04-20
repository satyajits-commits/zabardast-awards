import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import Header from './components/Header'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Nominations from './pages/Nominations'
import HodReview from './pages/HodReview'
import Settings from './pages/Settings'
import Download from './pages/Download'

function ProtectedRoute({ children, roles }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to={defaultForRole(user.role)} replace />
  return children
}

function defaultForRole(role) {
  if (role === 'manager') return '/nominations'
  if (role === 'hod') return '/hod-review'
  return '/dashboard'
}

function AppRoutes() {
  const { user } = useAuth()
  const dest = user ? defaultForRole(user.role) : '/login'

  return (
    <div className="min-h-screen bg-[#FDF8F4]">
      {user && <Header />}
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to={dest} replace />} />

        <Route path="/dashboard" element={
          <ProtectedRoute roles={['admin']}><Dashboard /></ProtectedRoute>
        } />
        <Route path="/nominations" element={
          <ProtectedRoute roles={['manager']}><Nominations /></ProtectedRoute>
        } />
        <Route path="/hod-review" element={
          <ProtectedRoute roles={['hod']}><HodReview /></ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute roles={['admin']}><Settings /></ProtectedRoute>
        } />
        <Route path="/download" element={
          <ProtectedRoute roles={['admin']}><Download /></ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to={dest} replace />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

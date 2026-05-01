import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import WorkUpdatePage from './pages/WorkUpdatePage'
import ReportIssuePage from './pages/ReportIssuePage'
import MyTasksPage from './pages/MyTasksPage'
import VerifyPage from './pages/VerifyPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import ManagerDashboardPage from './pages/ManagerDashboardPage'
import IssuesPage from './pages/IssuesPage'
import AuditPage from './pages/AuditPage'

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontSize:'1.1rem', color:'#64748b' }}>Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const { user } = useAuth()

  return (
    <BrowserRouter>
      {user && <Navbar />}
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />

        <Route path="/" element={
          <ProtectedRoute><HomePage /></ProtectedRoute>
        } />

        <Route path="/work/new" element={
          <ProtectedRoute roles={['Admin','Manager']}><WorkUpdatePage /></ProtectedRoute>
        } />

        <Route path="/issue/new" element={
          <ProtectedRoute roles={['Admin','Manager']}><ReportIssuePage /></ProtectedRoute>
        } />

        <Route path="/my-tasks" element={
          <ProtectedRoute roles={['Admin','Manager']}><MyTasksPage /></ProtectedRoute>
        } />

        <Route path="/verify" element={
          <ProtectedRoute roles={['Manager','Admin']}><VerifyPage /></ProtectedRoute>
        } />

        <Route path="/dashboard" element={
          <ProtectedRoute roles={['Admin','Manager']}>
            {user?.role === 'Admin' ? <AdminDashboardPage /> : <ManagerDashboardPage />}
          </ProtectedRoute>
        } />

        <Route path="/audit/new" element={
          <ProtectedRoute roles={['Admin']}><AuditPage /></ProtectedRoute>
        } />
        
        <Route path="/issues" element={
          <ProtectedRoute roles={['Admin','Manager']}><IssuesPage /></ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

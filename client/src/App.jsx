import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import { lazy, Suspense } from 'react'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const HomePage = lazy(() => import('./pages/HomePage'))
const WorkUpdatePage = lazy(() => import('./pages/WorkUpdatePage'))
const ReportIssuePage = lazy(() => import('./pages/ReportIssuePage'))
const MyTasksPage = lazy(() => import('./pages/MyTasksPage'))
const VerifyPage = lazy(() => import('./pages/VerifyPage'))
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'))
const ManagerDashboardPage = lazy(() => import('./pages/ManagerDashboardPage'))
const IssuesPage = lazy(() => import('./pages/IssuesPage'))
const AuditPage = lazy(() => import('./pages/AuditPage'))

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
      <Suspense fallback={<div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'80vh', color:'#64748b' }}>Loading Page…</div>}>
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
      </Suspense>
    </BrowserRouter>
  )
}

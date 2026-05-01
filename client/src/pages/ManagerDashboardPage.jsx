import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { 
  Clock, AlertCircle, CheckSquare, PlusCircle, 
  ChevronRight, RefreshCw, Layout, Zap, Calendar, TrendingUp,
  ArrowRight
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function ManagerDashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ pending: 0, rejected: 0, assigned: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchStats() }, [])

  const fetchStats = async () => {
    setLoading(true)
    try {
      const [pending, rejected, assigned] = await Promise.all([
        supabase.from('work_updates').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('workflow_status', 'PENDING_REVIEW'),
        supabase.from('work_updates').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('workflow_status', 'REJECTED'),
        supabase.from('issues').select('*', { count: 'exact', head: true }).eq('assigned_to', user.id).neq('lifecycle_status', 'CLOSED')
      ])
      setStats({
        pending: pending.count || 0,
        rejected: rejected.count || 0,
        assigned: assigned.count || 0
      })
    } catch (e) {
      toast.error('Failed to load stats')
    } finally {
      setLoading(false)
    }
  }

  const statRows = [
    { label: 'Tasks Pending Review', value: stats.pending, icon: <Clock size={20} />, color: '#6366f1', bg: '#eef2ff' },
    { label: 'Rejected - Action Needed', value: stats.rejected, icon: <AlertCircle size={20} />, color: '#ef4444', bg: '#fef2f2' },
    { label: 'Issues Assigned to Me', value: stats.assigned, icon: <CheckSquare size={20} />, color: '#10b981', bg: '#ecfdf5' },
  ]

  return (
    <div className="page fade-in" style={{ paddingBottom: '120px' }}>
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', padding: '0 4px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.04em' }}>
            My Operations
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.95rem', fontWeight: 600 }}>
            Daily Workflow Control
          </p>
        </div>
        <button onClick={fetchStats} className="btn-icon" style={{ borderRadius: '50%', boxShadow: 'var(--shadow-sm)' }}>
          <RefreshCw size={20} className={loading ? 'spin' : ''} color="var(--primary)" />
        </button>
      </div>

      {/* Vertical Stats Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '32px' }}>
        {statRows.map((s, i) => (
          <div key={i} className="card" style={{ 
            padding: '20px', 
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'white',
            border: '1px solid rgba(226, 232, 240, 0.4)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ 
                width: 48, height: 48, borderRadius: '16px', 
                background: s.bg, color: s.color, 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 8px 16px ${s.bg}`
              }}>
                {s.icon}
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {s.label}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a' }}>{s.value}</div>
              </div>
            </div>
            <ArrowRight size={20} color="#cbd5e1" />
          </div>
        ))}
      </div>

      {/* Actions & Upcoming Section (Vertical Stack) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Quick Actions Row */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingLeft: '4px' }}>
            <Zap size={18} color="var(--primary)" fill="var(--primary)" />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Quick Actions</h3>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <button 
              onClick={() => navigate('/work/new')}
              style={{ 
                padding: '20px 16px', borderRadius: '24px', 
                background: 'linear-gradient(135deg, var(--primary), #4f46e5)',
                boxShadow: '0 10px 25px rgba(37, 99, 235, 0.25)',
                color: 'white', border: 'none', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '12px',
                textAlign: 'left'
              }}>
              <PlusCircle size={24} />
              <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>Submit<br/>Work Update</span>
            </button>

            <button 
              onClick={() => navigate('/issues')}
              style={{ 
                padding: '20px 16px', borderRadius: '24px', 
                background: 'white',
                boxShadow: 'var(--shadow-sm)',
                color: '#1e293b', border: '1px solid #e2e8f0', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '12px',
                textAlign: 'left'
              }}>
              <AlertCircle size={24} color="#64748b" />
              <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>Report<br/>New Issue</span>
            </button>
          </div>
        </div>

        {/* Upcoming Deadlines Row */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingLeft: '4px' }}>
            <Calendar size={18} color="var(--secondary)" fill="var(--secondary)" />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Critical Deadlines</h3>
          </div>
          
          <div className="card" style={{ padding: '24px', background: 'white', textAlign: 'center' }}>
            <div style={{ 
              width: 54, height: 54, borderRadius: '50%', 
              background: '#f8fafc', display: 'flex', 
              alignItems: 'center', justifyContent: 'center', 
              margin: '0 auto 16px', color: '#cbd5e1'
            }}>
              <TrendingUp size={28} />
            </div>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b', fontWeight: 600, lineHeight: 1.5 }}>
              Your operational performance is stable.<br/>No immediate deadlines found.
            </p>
          </div>
        </div>

        {/* Activity Feed Row */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '0 4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layout size={18} color="#64748b" />
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Recent Activity</h3>
            </div>
            <button onClick={() => navigate('/my-tasks')} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
              See All
            </button>
          </div>
          
          <div className="card" style={{ padding: '24px', background: '#f8fafc', border: '1px dashed #cbd5e1' }}>
            <p style={{ margin: 0, textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem', fontWeight: 600 }}>
              Fetching latest work history...
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}

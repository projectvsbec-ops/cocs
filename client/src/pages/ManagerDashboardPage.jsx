import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { 
  Clock, AlertCircle, CheckSquare, PlusCircle, 
  ChevronRight, RefreshCw, Layout, Zap, Calendar, TrendingUp
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

  const statCards = [
    { label: 'Pending Review', value: stats.pending, icon: <Clock size={20} />, color: '#6366f1', bg: '#eef2ff' },
    { label: 'Action Needed', value: stats.rejected, icon: <AlertCircle size={20} />, color: '#ef4444', bg: '#fef2f2' },
    { label: 'Active Issues', value: stats.assigned, icon: <CheckSquare size={20} />, color: '#10b981', bg: '#ecfdf5' },
  ]

  return (
    <div className="page fade-in" style={{ paddingBottom: '100px' }}>
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>
            My Operations
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.9rem', fontWeight: 500 }}>
            Manage tasks and resolve active issues
          </p>
        </div>
        <button onClick={fetchStats} className="btn-icon" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
          <RefreshCw size={20} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {/* Stats Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: '12px', 
        marginBottom: '24px' 
      }}>
        {statCards.map((s, i) => (
          <div key={i} className="card" style={{ 
            padding: '16px 12px', 
            textAlign: 'center', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            gap: '8px',
            border: `1px solid ${s.bg}`,
            background: 'white',
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
          }}>
            <div style={{ 
              width: 40, height: 40, borderRadius: '12px', 
              background: s.bg, color: s.color, 
              display: 'flex', alignItems: 'center', justifyContent: 'center' 
            }}>
              {s.icon}
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a' }}>{s.value}</div>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Quick Actions Card */}
        <div className="card" style={{ padding: '20px', background: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <Zap size={18} color="var(--primary)" />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Quick Actions</h3>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button 
              onClick={() => navigate('/work/new')}
              className="btn btn-primary" 
              style={{ 
                padding: '16px', borderRadius: '16px', 
                justifyContent: 'space-between', width: '100%',
                background: 'linear-gradient(135deg, var(--primary), #4f46e5)',
                boxShadow: '0 8px 20px rgba(37, 99, 235, 0.2)'
              }}>
              <span style={{ fontWeight: 800 }}>Submit Work</span>
              <PlusCircle size={18} />
            </button>

            <button 
              onClick={() => navigate('/issues')}
              className="btn" 
              style={{ 
                padding: '16px', borderRadius: '16px', 
                justifyContent: 'space-between', width: '100%',
                background: '#f8fafc', border: '1px solid #e2e8f0',
                color: '#475569'
              }}>
              <span style={{ fontWeight: 800 }}>Report Issue</span>
              <AlertCircle size={18} />
            </button>
          </div>
        </div>

        {/* Timeline/Deadlines Card */}
        <div className="card" style={{ padding: '20px', background: 'white', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <Calendar size={18} color="var(--secondary)" />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Upcoming</h3>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '10px' }}>
            <div style={{ 
              width: 48, height: 48, borderRadius: '50%', 
              background: '#f8fafc', display: 'flex', 
              alignItems: 'center', justifyContent: 'center', 
              marginBottom: '12px', color: '#cbd5e1'
            }}>
              <TrendingUp size={24} />
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, lineHeight: 1.4 }}>
              No critical deadlines for your active tasks.
            </p>
          </div>
        </div>
      </div>

      {/* Recent Activity Mini-Section */}
      <div style={{ marginTop: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '0 4px' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Recent History</h3>
          <button onClick={() => navigate('/my-tasks')} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
            View All
          </button>
        </div>
        
        <div className="card" style={{ padding: '16px', background: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', color: '#94a3b8', fontSize: '0.9rem', fontWeight: 500 }}>
            <Layout size={20} style={{ marginRight: '8px', opacity: 0.5 }} />
            Syncing with latest activities...
          </div>
        </div>
      </div>
    </div>
  )
}

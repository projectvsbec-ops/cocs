import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { 
  ClipboardList, AlertCircle, CheckSquare, Clock, 
  ArrowRight, RefreshCw, Layout 
} from 'lucide-react'

function SummaryCard({ label, value, icon, color }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: '20px', padding: '24px',
      border: '1px solid #f1f5f9',
      boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
      flex: 1
    }}>
      <div style={{ color, marginBottom: '12px' }}>{icon}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>{value}</div>
      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8', marginTop: '4px' }}>{label}</div>
    </div>
  )
}

export default function ManagerDashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadManagerStats = async () => {
    if (!user) return
    setLoading(true)
    try {
      const [
        { count: activeTasks },
        { count: rejectedWork },
        { count: activeIssues }
      ] = await Promise.all([
        supabase.from('work_updates').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('workflow_status', 'SUBMITTED'),
        supabase.from('work_updates').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('workflow_status', 'REJECTED'),
        supabase.from('issues').select('*', { count: 'exact', head: true }).eq('assigned_to', user.id).neq('lifecycle_status', 'CLOSED')
      ])

      setStats({
        activeTasks: activeTasks || 0,
        rejectedWork: rejectedWork || 0,
        activeIssues: activeIssues || 0
      })
    } catch (err) {
      console.error(err)
      toast.error('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadManagerStats() }, [user])

  if (loading) return <div className="page fade-in">Loading performance data…</div>

  return (
    <div className="page fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#1e293b' }}>
            <Layout size={28} style={{ verticalAlign: 'middle', marginRight: '10px', color: '#0891b2' }} />
            My Operations
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b' }}>Manage your tasks and resolve active issues</p>
        </div>
        <button onClick={loadManagerStats} className="btn-icon">
          <RefreshCw size={20} />
        </button>
      </div>

      <div style={{ display: 'flex', gap: '20px', marginBottom: '32px' }}>
        <SummaryCard label="Tasks Pending Review" value={stats.activeTasks} icon={<Clock size={28} />} color="#d97706" />
        <SummaryCard label="Rejected - Action Needed" value={stats.rejectedWork} icon={<AlertCircle size={28} />} color="#dc2626" />
        <SummaryCard label="Assigned Issues" value={stats.activeIssues} icon={<CheckSquare size={28} />} color="#0891b2" />
      </div>

      <div className="grid-2">
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 700 }}>📋 Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button className="btn btn-primary" style={{ justifyContent: 'space-between', padding: '16px' }}>
              <span>Submit Work Update</span>
              <ArrowRight size={18} />
            </button>
            <button className="btn" style={{ justifyContent: 'space-between', padding: '16px', background: '#fee2e2', color: '#dc2626', border: 'none' }}>
              <span>Report New Issue</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 700 }}>⏳ Upcoming Deadlines</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>SLA-driven task deadlines will appear here.</p>
        </div>
      </div>
    </div>
  )
}

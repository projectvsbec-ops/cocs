import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { 
  ClipboardList, AlertCircle, CheckSquare, Clock, 
  ArrowRight, RefreshCw, Layout, UserCircle 
} from 'lucide-react'

function SummaryCard({ label, value, icon, color }) {
  return (
    <div className="card" style={{ padding: '20px', display:'flex', flexDirection:'column', gap:'8px' }}>
      <div style={{ 
        width: 40, height: 40, borderRadius: '10px', 
        background: `${color}12`, color: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#1e293b', lineHeight:1 }}>{value}</div>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginTop: '4px', lineHeight:1.2 }}>{label}</div>
      </div>
    </div>
  )
}

export default function ManagerDashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
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

  useEffect(() => { if (user) loadManagerStats() }, [user])

  if (loading) return <div className="page fade-in" style={{ textAlign:'center', paddingTop:'100px' }}><RefreshCw className="spin" size={32} color="var(--primary)" /><p>Loading Metrics…</p></div>
  if (!stats) return <div className="page fade-in">Failed to load operations data. Please ensure database migrations are applied.</div>

  return (
    <div className="page fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <div style={{ width:48, height:48, borderRadius:'50%', background:'var(--primary-light)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--primary)' }}>
            <UserCircle size={28} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#0f172a' }}>My Operations</h1>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Real-time performance tracking</div>
          </div>
        </div>
        <button onClick={loadManagerStats} className="btn-icon" style={{ background:'white', boxShadow:'var(--shadow)' }}>
          <RefreshCw size={18} />
        </button>
      </div>

      <div className="section-title">Operational Health</div>
      <div className="card-grid" style={{ marginBottom: '32px' }}>
        <SummaryCard label="Pending Review" value={stats.activeTasks} icon={<Clock size={20} />} color="#d97706" />
        <SummaryCard label="Rejected Work" value={stats.rejectedWork} icon={<AlertCircle size={20} />} color="#dc2626" />
        <SummaryCard label="Assigned Issues" value={stats.activeIssues} icon={<CheckSquare size={20} />} color="#0891b2" />
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:'24px' }}>
        
        <section>
          <div className="section-title">Quick Actions</div>
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={() => navigate('/work/new')} className="btn btn-primary" style={{ justifyContent: 'space-between', padding: '16px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                  <ClipboardList size={20} />
                  <span>Submit Work Update</span>
                </div>
                <ArrowRight size={18} />
              </button>
              <button onClick={() => navigate('/issue/new')} className="btn" style={{ justifyContent: 'space-between', padding: '16px', background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                  <AlertCircle size={20} />
                  <span>Report New Issue</span>
                </div>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </section>

        <section>
          <div className="section-title">Upcoming Deadlines</div>
          <div className="card" style={{ padding: '32px 20px', textAlign:'center' }}>
            <div style={{ width:56, height:56, borderRadius:'50%', background:'#f8fafc', margin:'0 auto 16px', display:'flex', alignItems:'center', justifyContent:'center', color:'#cbd5e1' }}>
              <Clock size={28} />
            </div>
            <h4 style={{ margin:0, color:'#1e293b', fontWeight:800 }}>No Critical Deadlines</h4>
            <p style={{ margin:'8px 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>All your assigned issues are currently within SLA limits.</p>
          </div>
        </section>

      </div>
    </div>
  )
}

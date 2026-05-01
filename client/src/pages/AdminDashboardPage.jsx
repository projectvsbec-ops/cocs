import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'
import toast from 'react-hot-toast'
import { 
  BarChart2, AlertTriangle, CheckCircle, Clock, 
  TrendingUp, Shield, Activity, RefreshCw 
} from 'lucide-react'

function StatCard({ label, value, icon, color, bg }) {
  return (
    <div style={{
      background: bg || 'white',
      borderRadius: '20px', padding: '20px',
      border: `1px solid ${color}15`,
      boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
      display: 'flex', flexDirection: 'column', gap: '8px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ padding: '8px', borderRadius: '12px', background: `${color}15`, color }}>{icon}</div>
      </div>
      <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e293b' }}>{value}</div>
    </div>
  )
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadStats = async () => {
    setLoading(true)
    try {
      const now = new Date().toISOString()
      
      const [
        { count: totalWork },
        { count: pendingApproval },
        { count: openIssues },
        { count: slaBreaches },
        { data: auditTrends }
      ] = await Promise.all([
        supabase.from('work_updates').select('*', { count: 'exact', head: true }),
        supabase.from('work_updates').select('*', { count: 'exact', head: true }).eq('workflow_status', 'SUBMITTED'),
        supabase.from('issues').select('*', { count: 'exact', head: true }).neq('lifecycle_status', 'CLOSED'),
        supabase.from('issues').select('*', { count: 'exact', head: true }).lt('due_at', now).neq('lifecycle_status', 'CLOSED'),
        supabase.from('audits').select('score, created_at').order('created_at', { ascending: false }).limit(10)
      ])

      const avgAuditScore = auditTrends?.length > 0 
        ? Math.round(auditTrends.reduce((acc, curr) => acc + curr.score, 0) / auditTrends.length)
        : 0

      setStats({
        totalWork: totalWork || 0,
        pendingApproval: pendingApproval || 0,
        openIssues: openIssues || 0,
        slaBreaches: slaBreaches || 0,
        avgAuditScore,
        recentAudits: auditTrends || []
      })
    } catch (err) {
      console.error(err)
      toast.error('Failed to load dashboard metrics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadStats() }, [])

  if (loading) return <div className="page fade-in">Loading metrics…</div>

  return (
    <div className="page fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#1e293b' }}>
            <Shield size={28} style={{ verticalAlign: 'middle', marginRight: '10px', color: '#7c3aed' }} />
            System Oversight
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b' }}>Enterprise-level campus operations control</p>
        </div>
        <button onClick={loadStats} className="btn-icon">
          <RefreshCw size={20} />
        </button>
      </div>

      <div className="card-grid" style={{ marginBottom: '32px' }}>
        <StatCard label="Total Work" value={stats.totalWork} icon={<Activity size={22} />} color="#2563eb" />
        <StatCard label="Pending Approval" value={stats.pendingApproval} icon={<Clock size={22} />} color="#d97706" />
        <StatCard label="SLA Breaches" value={stats.slaBreaches} icon={<AlertTriangle size={22} />} color="#dc2626" bg="#fff5f5" />
        <StatCard label="Audit Quality" value={`${stats.avgAuditScore}%`} icon={<CheckCircle size={22} />} color="#16a34a" />
      </div>

      <div className="grid-2">
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '1.1rem', fontWeight: 700 }}>🚨 Critical Issues</h3>
          {/* List of high priority issues with SLA timers */}
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Real-time issue tracking module coming soon…</p>
        </div>
        
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '1.1rem', fontWeight: 700 }}>📈 Audit Trends</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {stats.recentAudits.map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  width: '40px', height: '40px', borderRadius: '10px', 
                  background: a.score >= 80 ? '#dcfce7' : a.score >= 50 ? '#fef9c3' : '#fee2e2',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, color: a.score >= 80 ? '#15803d' : a.score >= 50 ? '#a16207' : '#b91c1c'
                }}>
                  {a.score}
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Inspection Review</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{new Date(a.created_at).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

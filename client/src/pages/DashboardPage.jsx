import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'
import toast from 'react-hot-toast'
import { RefreshCw, BarChart2, AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react'

function StatCard({ label, value, icon, color, bg }) {
  return (
    <div style={{
      background: bg || '#f8fafc',
      borderRadius:'16px', padding:'18px',
      border:`1px solid ${color}22`,
      display:'flex', flexDirection:'column', gap:'8px'
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ fontSize:'0.75rem', fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</div>
        <div style={{ color, opacity:0.8 }}>{icon}</div>
      </div>
      <div className="stat-value" style={{ color:'#1e293b' }}>{value}</div>
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      // Run multiple aggregation queries concurrently
      const [
        { count: totalWork },
        { count: completed },
        { count: pending },
        { count: openIssues },
        { count: highPriority },
        { count: approvedWork },
        { count: rejectedWork },
        { data: allWork },
        { data: allIssues },
        { data: activity },
        { data: departments }
      ] = await Promise.all([
        supabase.from('work_updates').select('*', { count: 'exact', head: true }),
        supabase.from('work_updates').select('*', { count: 'exact', head: true }).eq('status', 'Completed'),
        supabase.from('work_updates').select('*', { count: 'exact', head: true }).eq('status', 'Pending'),
        supabase.from('issues').select('*', { count: 'exact', head: true }).eq('status', 'Open'),
        supabase.from('issues').select('*', { count: 'exact', head: true }).eq('priority', 'High').neq('status', 'Closed'),
        supabase.from('work_updates').select('*', { count: 'exact', head: true }).eq('verified_status', 'Approved'),
        supabase.from('work_updates').select('*', { count: 'exact', head: true }).eq('verified_status', 'Rejected'),
        // For department grouping, we need the raw data (Supabase doesn't easily do GROUP BY natively without RPC)
        supabase.from('work_updates').select('department_id, status, verified_status, departments(name)'),
        supabase.from('issues').select('priority'),
        supabase.from('activity_log').select('*, profiles!user_id(name)').order('created_at', { ascending: false }).limit(10),
        supabase.from('departments').select('id, name')
      ])

      // Process deptStats
      const deptMap = {}
      if (departments) {
        departments.forEach(d => {
          deptMap[d.id] = { department: d.name, total_updates: 0, completed: 0, approved: 0 }
        })
      }
      if (allWork) {
        allWork.forEach(w => {
          if (!w.department_id || !deptMap[w.department_id]) return
          deptMap[w.department_id].total_updates++
          if (w.status === 'Completed') deptMap[w.department_id].completed++
          if (w.verified_status === 'Approved') deptMap[w.department_id].approved++
        })
      }
      const deptStats = Object.values(deptMap).sort((a, b) => b.total_updates - a.total_updates)

      // Process issuesByPriority
      const issuesMap = { High: 0, Medium: 0, Low: 0 }
      if (allIssues) {
        allIssues.forEach(i => {
          if (issuesMap[i.priority] !== undefined) issuesMap[i.priority]++
        })
      }
      const issuesByPriority = Object.keys(issuesMap)
        .filter(k => issuesMap[k] > 0)
        .map(k => ({ priority: k, count: issuesMap[k] }))

      setStats({
        summary: {
          total_work_updates: totalWork || 0,
          completed: completed || 0,
          pending: pending || 0,
          open_issues: openIssues || 0,
          high_priority_issues: highPriority || 0,
          approved_work: approvedWork || 0,
          rejected_work: rejectedWork || 0,
        },
        dept_stats: deptStats,
        issues_by_priority: issuesByPriority,
        recent_activity: activity || [],
      })
    } catch (err) {
      console.error(err)
      toast.error('Could not load dashboard') 
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  if (loading) return (
    <div className="page fade-in">
      <h1 style={{ margin:'0 0 20px', fontSize:'1.5rem', fontWeight:800 }}>📊 Dashboard</h1>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
        {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton" style={{ height:'90px', borderRadius:'16px' }} />)}
      </div>
    </div>
  )

  const s = stats?.summary || {}
  const deptStats = stats?.dept_stats || []
  const activity = stats?.recent_activity || []
  const issuesByPriority = stats?.issues_by_priority || []

  const completionRate = s.total_work_updates > 0
    ? Math.round((s.completed / s.total_work_updates) * 100)
    : 0

  return (
    <div className="page fade-in">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
        <div>
          <h1 style={{ margin:0, fontSize:'1.5rem', fontWeight:800 }}>📊 Dashboard</h1>
          <p style={{ margin:'4px 0 0', color:'#64748b', fontSize:'0.85rem' }}>Live overview of all departments</p>
        </div>
        <button onClick={load} style={{ background:'#f1f5f9', border:'none', borderRadius:'10px', width:40, height:40, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#475569' }}>
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="card-grid" style={{ marginBottom:'24px' }}>
        <StatCard label="Total Updates" value={s.total_work_updates||0} icon={<BarChart2 size={22} />} color="#2563eb" />
        <StatCard label="Completed" value={s.completed||0} icon={<CheckCircle size={22} />} color="#16a34a" />
        <StatCard label="Pending" value={s.pending||0} icon={<Clock size={22} />} color="#d97706" />
        <StatCard label="Open Issues" value={s.open_issues||0} icon={<AlertTriangle size={22} />} color="#dc2626" />
        <StatCard label="High Priority" value={s.high_priority_issues||0} icon={<AlertTriangle size={22} />} color="#dc2626" bg="#fff5f5" />
        <StatCard label="Completion %" value={`${completionRate}%`} icon={<TrendingUp size={22} />} color="#7c3aed" bg="#faf5ff" />
      </div>

      {/* Completion bar */}
      <div className="card" style={{ padding:'18px', marginBottom:'20px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'10px' }}>
          <span style={{ fontWeight:700, fontSize:'0.9rem' }}>Overall Completion Rate</span>
          <span style={{ fontWeight:800, color:'#2563eb' }}>{completionRate}%</span>
        </div>
        <div style={{ height:'12px', background:'#e2e8f0', borderRadius:'999px', overflow:'hidden' }}>
          <div style={{
            height:'100%', width:`${completionRate}%`,
            background:'linear-gradient(90deg, #2563eb, #7c3aed)',
            borderRadius:'999px', transition:'width 0.6s ease'
          }} />
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:'8px', fontSize:'0.75rem', color:'#94a3b8' }}>
          <span>✅ Approved: {s.approved_work||0}</span>
          <span>❌ Rejected: {s.rejected_work||0}</span>
        </div>
      </div>

      {/* Issues by Priority */}
      {issuesByPriority.length > 0 && (
        <div className="card" style={{ padding:'18px', marginBottom:'20px' }}>
          <h3 style={{ margin:'0 0 14px', fontSize:'1rem', fontWeight:700 }}>🚨 Issues by Priority</h3>
          {issuesByPriority.map(ip => {
            const color = ip.priority==='High'?'#dc2626':ip.priority==='Medium'?'#d97706':'#16a34a'
            return (
              <div key={ip.priority} style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'10px' }}>
                <div style={{ width:'70px', fontSize:'0.82rem', fontWeight:700, color }}>{ip.priority}</div>
                <div style={{ flex:1, height:'10px', background:'#f1f5f9', borderRadius:'999px', overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${Math.min((ip.count/Math.max(s.open_issues,1))*100,100)}%`, background:color, borderRadius:'999px' }} />
                </div>
                <div style={{ fontSize:'0.82rem', fontWeight:700, color:'#475569', minWidth:'24px', textAlign:'right' }}>{ip.count}</div>
              </div>
            )
          })}
        </div>
      )}

      {/* Department Stats */}
      <div className="card" style={{ padding:'18px', marginBottom:'20px' }}>
        <h3 style={{ margin:'0 0 14px', fontSize:'1rem', fontWeight:700 }}>🏢 Department Performance</h3>
        {deptStats.length === 0 ? (
          <p style={{ color:'#94a3b8', fontSize:'0.85rem' }}>No data yet</p>
        ) : deptStats.map((d, i) => (
          <div key={i} style={{
            display:'flex', justifyContent:'space-between', alignItems:'center',
            padding:'10px 0', borderBottom: i < deptStats.length-1 ? '1px solid #f1f5f9' : 'none'
          }}>
            <div>
              <div style={{ fontWeight:600, fontSize:'0.9rem' }}>{d.department}</div>
              <div style={{ fontSize:'0.75rem', color:'#94a3b8' }}>{d.total_updates} updates</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontWeight:700, color:'#16a34a', fontSize:'0.9rem' }}>✅ {d.completed || 0}</div>
              <div style={{ fontSize:'0.72rem', color:'#94a3b8' }}>completed</div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="card" style={{ padding:'18px' }}>
        <h3 style={{ margin:'0 0 14px', fontSize:'1rem', fontWeight:700 }}>🕐 Recent Activity</h3>
        {activity.length === 0 ? (
          <p style={{ color:'#94a3b8', fontSize:'0.85rem' }}>No activity yet</p>
        ) : activity.map(a => (
          <div key={a.id} style={{
            display:'flex', gap:'12px', alignItems:'flex-start',
            padding:'8px 0', borderBottom:'1px solid #f8fafc'
          }}>
            <div style={{
              width:32, height:32, borderRadius:'10px', background:'#eff6ff',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'0.8rem', flexShrink:0
            }}>
              {a.action==='WORK_UPDATE'?'📋':a.action==='ISSUE_REPORT'?'🚨':a.action==='VERIFY'?'✅':'🔍'}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:600, fontSize:'0.85rem' }}>{a.profiles?.name}</div>
              <div style={{ fontSize:'0.78rem', color:'#64748b' }}>{a.detail}</div>
              <div style={{ fontSize:'0.72rem', color:'#94a3b8', marginTop:'2px' }}>
                {new Date(a.created_at).toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
